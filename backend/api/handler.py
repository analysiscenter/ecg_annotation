import os
import re
import stat
import json
import shutil
import logging
import threading
from datetime import datetime
from collections import OrderedDict

import numpy as np
import pandas as pd
from watchdog.observers import Observer
from watchdog.events import FileSystemEvent, RegexMatchingEventHandler

from .loader import load_data


def synchronized(method):
    def decorated(self, *args, **kwargs):
        with self.lock:
            return method(self, *args, **kwargs)
    return decorated


class EcgDirectoryHandler(RegexMatchingEventHandler):
    def __init__(self, namespace, watch_dir, dump_dir, annotation_list_path, annotation_count_path,
                 submitted_annotation_path, *args, **kwargs):
        self.pattern = "^.+\.xml$"
        super().__init__([self.pattern], *args, **kwargs)
        self.namespace = namespace
        self.watch_dir = watch_dir
        self.dump_dir = dump_dir
        self.annotation_list_path = annotation_list_path
        self.annotation_count_path = annotation_count_path
        self.submitted_annotation_path = submitted_annotation_path
        self.logger = logging.getLogger("server." + __name__)
        self.lock = threading.RLock()

        self.data = OrderedDict()
        self.annotation_dict = {}
        self.annotation_count_dict = OrderedDict()
        self.dumped_signals = set()

        self.logger.info("Initial loading started")
        self._load_annotation_list()
        self._load_data()
        self._load_annotation_count()
        self._load_submitted_annotation()
        self.logger.info("Initial loading finished")
        self._log_data()

        self.logger.info("Launching directory observer")
        self.observer = Observer()
        self.observer.schedule(self, self.watch_dir)
        self.observer.start()
        self.logger.info("Directory observer launched")

    def _log_data(self):
        file_names = [signal_data["file_name"] for sha, signal_data in self.data.items()]
        self.logger.debug("{} ECGs are stored: {}".format(len(self.data), ", ".join(file_names)))

    def _load_annotation_list(self):
        with open(self.annotation_list_path, encoding="utf-8") as json_data:
            self.annotation_dict = json.load(json_data, object_pairs_hook=OrderedDict)
        if not self.annotation_dict:
            raise ValueError("A list of possible ECG annotations can not be empty")
        for group, annotations in self.annotation_dict.items():
            if not annotations:
                self.annotation_count_dict[group] = 0
            else:
                for annotation in annotations:
                    self.annotation_count_dict[group + "/" + annotation] = 0
        debug_str = "{} groups with {} possible annotations are loaded"
        self.logger.debug(debug_str.format(len(self.annotation_dict), len(self.annotation_count_dict)))

    def _load_data(self):
        path_gen = (os.path.join(self.watch_dir, f) for f in sorted(os.listdir(self.watch_dir))
                    if re.match(self.pattern, f) is not None)
        for path in path_gen:
            self._update_data(path)

    def _load_annotation_count(self):
        if not os.path.isfile(self.annotation_count_path):
            self.logger.debug("There is no annotation count file")
            return
        with open(self.annotation_count_path, encoding="utf-8") as json_data:
            annotation_count_dict = json.load(json_data)
        for annotation in self.annotation_count_dict:
            self.annotation_count_dict[annotation] += annotation_count_dict.get(annotation, 0)
        self.logger.debug("Counts for submitted annotations are loaded")

    def _load_submitted_annotation(self):
        if not os.path.isfile(self.submitted_annotation_path):
            self.logger.debug("There are no submitted annotations")
            return
        df = pd.read_feather(self.submitted_annotation_path).set_index("index")
        counts = df.sum()
        for annotation in self.annotation_count_dict:
            self.annotation_count_dict[annotation] += int(counts.get(annotation, 0))
        n_loaded = 0
        for sha, signal_data in self.data.items():
            if signal_data["file_name"] in df.index:
                annotation = df.loc[signal_data["file_name"]]
                annotation = annotation[annotation != 0].index.tolist()
                diff = sorted(set(annotation) - set(self.annotation_count_dict.keys()))
                if diff:
                    debug_str = "Submitted annotation for signal {} contains unknown values {} and will not be used"
                    self.logger.debug(debug_str.format(signal_data["file_name"], ", ".join(diff)))
                else:
                    signal_data["annotation"] = annotation
                    n_loaded += 1
        self.logger.debug("Submitted annotations for {} signals are loaded".format(n_loaded))

    def _remove_file(self, path):
        self.logger.debug("The same ECG already exists, deleting the file {}".format(path))
        os.remove(path)

    def _update_data(self, path, retries=1, timeout=0.1):
        sha, signal_data = load_data(path, retries, timeout)
        existing_data = self.data.get(sha)
        if existing_data is None:
            self.data[sha] = signal_data
        elif existing_data["modification_time"] > signal_data["modification_time"]:
            if existing_data["annotation"]:
                signal_data["annotation"] = existing_data["annotation"]
                self._dump_annotation()
            self.data[sha] = signal_data
            self._remove_file(os.path.join(self.watch_dir, existing_data["file_name"]))
        else:
            self._remove_file(path)

    def _encode_annotation(self, annotation):
        return np.isin(list(self.annotation_count_dict.keys()), annotation).astype(int)

    def _dump_annotation(self):
        annotations = []
        for sha, signal_data in self.data.items():
            if signal_data["annotation"]:
                annotations.append((signal_data["file_name"], self._encode_annotation(signal_data["annotation"])))
        if not annotations:
            self.logger.info("No annotation to dump")
            return
        index, annotations = zip(*annotations)
        annotations = np.array(annotations)
        self.logger.info("Dumping annotations for {}".format(", ".join(index)))
        df = pd.DataFrame(annotations, index=index, columns=list(self.annotation_count_dict.keys())).reset_index()
        df.to_feather(self.submitted_annotation_path)
        self.logger.info("Dump finished into {}".format(self.submitted_annotation_path))

    @synchronized
    def _get_annotation_list(self, data, meta):
        data = [{"id": group, "annotations": annotations} for group, annotations in self.annotation_dict.items()]
        return dict(data=data, meta=meta)

    @synchronized
    def _get_common_annotation_list(self, data, meta):
        N_TOP = 5
        STOPWORDS = ["Неинтерпретируемая ЭКГ", "Другая патология", "Другая патология из этой группы"]
        DEFAULTS = ["Нормальный ритм"]
        positive_count = {annotation: count for annotation, count in self.annotation_count_dict.items()
                          if count > 0 and not any(word in annotation for word in STOPWORDS)}
        annotations = sorted(positive_count, key=lambda x: (-positive_count[x], x))
        for default in sorted(DEFAULTS):
            if default not in annotations:
                annotations.append(default)
        annotations = annotations[:N_TOP]
        data = {"annotations": annotations}
        self.logger.debug("Top {} most common annotations: {}".format(N_TOP, ", ".join(annotations)))
        return dict(data=data, meta=meta)

    @synchronized
    def _get_ecg_list(self, data, meta):
        ecg_list = []
        for sha, signal_data in self.data.items():
            ecg_data = {
                "id": sha,
                "timestamp": signal_data["meta"]["timestamp"],
                "isAnnotated": bool(signal_data["annotation"]),
            }
            ecg_list.append(ecg_data)
        ecg_list = sorted(ecg_list, key=lambda val: val["timestamp"], reverse=True)
        for ecg_data in ecg_list:
            ecg_data["timestamp"] = ecg_data["timestamp"].strftime("%d.%m.%Y %H:%M:%S")
        return dict(data=ecg_list, meta=meta)

    @synchronized
    def _get_item_data(self, data, meta):
        sha = data.get("id")
        if sha is None or sha not in self.data:
            raise ValueError("Invalid sha {}".format(sha))
        signal_data = self.data[sha]
        data["signal"] = signal_data["signal"]
        data["frequency"] = signal_data["meta"]["fs"]
        data["units"] = signal_data["meta"]["units"]
        data["signame"] = signal_data["meta"]["signame"]
        data["annotation"] = signal_data["annotation"]
        return dict(data=data, meta=meta)

    @synchronized
    def _set_annotation(self, data, meta):
        sha = data.get("id")
        if sha is None or sha not in self.data:
            raise ValueError("Invalid sha {}".format(sha))
        annotation = data.get("annotation")
        if annotation is None:
            raise ValueError("Empty annotation")
        unknown_annotation = [ann for ann in annotation if ann not in self.annotation_count_dict]
        if unknown_annotation:
            raise ValueError("Unknown annotation: {}".format(", ".join(unknown_annotation)))
        for old_annotation in self.data[sha]["annotation"]:
            self.annotation_count_dict[old_annotation] -= 1
        self.data[sha]["annotation"] = annotation
        for new_annotation in self.data[sha]["annotation"]:
            self.annotation_count_dict[new_annotation] += 1
        self._dump_annotation()
        self.namespace.on_ECG_GET_COMMON_ANNOTATION_LIST({}, {})

    @synchronized
    def _dump_signals(self, data, meta):
        annotated_signals = {signal_data["file_name"] for sha, signal_data in self.data.items()
                             if signal_data["annotation"]}
        if not annotated_signals:
            self.logger.info("No annotated signals to dump")
            return
        self.logger.info("Dumping the following signals: {}".format(", ".join(sorted(annotated_signals))))
        self.dumped_signals |= annotated_signals
        dir_name = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        dump_dir = os.path.join(self.dump_dir, dir_name)
        os.makedirs(dump_dir)
        annotation_file = os.path.basename(self.submitted_annotation_path)
        shutil.move(self.submitted_annotation_path, os.path.join(dump_dir, annotation_file))

        data = OrderedDict()
        for sha, signal_data in self.data.items():
            if signal_data["annotation"]:
                shutil.move(os.path.join(self.watch_dir, signal_data["file_name"]),
                            os.path.join(dump_dir, signal_data["file_name"]))
            else:
                data[sha] = signal_data
        self.data = data
        archive_name = shutil.make_archive(dump_dir, "zip", dump_dir)

        def remove_readonly(func, path, _):
            os.chmod(path, stat.S_IWRITE)
            func(path)
        shutil.rmtree(dump_dir, onerror=remove_readonly)

        with open(self.annotation_count_path, "w", encoding="utf-8") as json_data:
            json.dump(self.annotation_count_dict, json_data)

        self.logger.info("Dump finished into {}".format(archive_name))
        self._log_data()
        self.namespace.on_ECG_GET_LIST({}, {})

    @synchronized
    def on_created(self, event):
        src = os.path.basename(event.src_path)
        self.logger.info("File created: {}".format(src))
        self._update_data(event.src_path, retries=5)
        self._log_data()
        self.namespace.on_ECG_GET_LIST({}, {})

    @synchronized
    def on_deleted(self, event):
        src = os.path.basename(event.src_path)
        if src in self.dumped_signals:
            self.dumped_signals.remove(src)
            return
        self.logger.info("File deleted: {}".format(src))
        need_dump = False
        data = OrderedDict()
        for sha, signal_data in self.data.items():
            if signal_data["file_name"] != src:
                data[sha] = signal_data
            elif signal_data["annotation"]:
                for annotation in signal_data["annotation"]:
                    self.annotation_count_dict[annotation] -= 1
                need_dump = True
        self.data = data
        if need_dump:
            self._dump_annotation()
            self.namespace.on_ECG_GET_COMMON_ANNOTATION_LIST({}, {})
        self._log_data()
        self.namespace.on_ECG_GET_LIST({}, {})

    @synchronized
    def on_moved(self, event):
        src = os.path.basename(event.src_path)
        src_match = re.match(self.pattern, src) is not None
        dst = os.path.basename(event.dest_path)
        dst_match = re.match(self.pattern, dst) is not None
        if not src_match and dst_match:
            return self.on_created(FileSystemEvent(event.dest_path))
        elif src_match and not dst_match:
            return self.on_deleted(FileSystemEvent(event.src_path))
        self.logger.info("File renamed: {} -> {}".format(src, dst))
        need_dump = False
        for sha, signal_data in self.data.items():
            if signal_data["file_name"] == src:
                signal_data["file_name"] = dst
                need_dump = bool(signal_data["annotation"])
        if need_dump:
            self._dump_annotation()
        self._log_data()
        self.namespace.on_ECG_GET_LIST({}, {})
