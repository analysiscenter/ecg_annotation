import logging

from watchdog.observers import Observer

from .handler import EcgDirectoryHandler
from .api_base import BaseNamespace


def create_namespace(server_config):
    logger = logging.getLogger("server." + __name__)

    logger.info("Creating annotation namespace")
    namespace = AnnotationNamespace("/api", is_shutdown_enabled=server_config.pop("is_shutdown_enabled"))
    handler = EcgDirectoryHandler(**server_config, ignore_directories=True)
    namespace.handler = handler
    handler.namespace = namespace
    logger.info("Namespace created")

    logger.info("Launching directory observer")
    observer = Observer()
    observer.schedule(handler, server_config["watch_dir"])
    observer.start()
    logger.info("Directory observer launched")
    return namespace


class AnnotationNamespace(BaseNamespace):
    def __init__(self, *args, is_shutdown_enabled, **kwargs):
        super().__init__(*args, **kwargs)
        self.is_shutdown_enabled = is_shutdown_enabled

    def on_ECG_GET_ANNOTATION_LIST(self, data, meta):
        self._safe_call(self.handler._get_annotation_list, data, meta, "ECG_GET_ANNOTATION_LIST",
                        "ECG_GOT_ANNOTATION_LIST")

    def on_ECG_GET_COMMON_ANNOTATION_LIST(self, data, meta):
        self._safe_call(self.handler._get_common_annotation_list, data, meta, "ECG_GET_COMMON_ANNOTATION_LIST",
                        "ECG_GOT_COMMON_ANNOTATION_LIST")

    def on_ECG_GET_LIST(self, data, meta):
        self._safe_call(self.handler._get_ecg_list, data, meta, "ECG_GET_LIST", "ECG_GOT_LIST")

    def on_ECG_GET_ITEM_DATA(self, data, meta):
        self._safe_call(self.handler._get_item_data, data, meta, "ECG_GET_ITEM_DATA", "ECG_GOT_ITEM_DATA")

    def on_ECG_SET_ANNOTATION(self, data, meta):
        self._safe_call(self.handler._set_annotation, data, meta, "ECG_SET_ANNOTATION")

    def on_ECG_DUMP_SIGNALS(self, data, meta):
        self._safe_call(self.handler._dump_signals, data, meta, "ECG_DUMP_SIGNALS")

    def on_SHUTDOWN(self, data, meta):
        if self.is_shutdown_enabled and self.n_connected == 1:
            self._safe_call(self.handler._shutdown, data, meta, "SHUTDOWN")
