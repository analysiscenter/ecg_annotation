import os
import sys
import time
import logging
from hashlib import sha256

import numpy as np

CURRENT_PATH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(1, os.path.join(CURRENT_PATH, "ecg"))
from cardio.core.ecg_batch_tools import load_xml_schiller
from cardio.core.utils import get_multiplier


def sha256_checksum(path, block_size=2**16):
    sha = sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(block_size), b""):
            sha.update(block)
    return sha.hexdigest()


def _convert_units(signal, meta, units):
    old_units = meta["units"]
    new_units = [units] * len(old_units)
    multiplier = [get_multiplier(old, new) for old, new in zip(old_units, new_units)]
    multiplier = np.array(multiplier).reshape(-1, 1)
    signal *= multiplier
    meta["units"] = np.asarray(new_units)
    return signal, meta


def _load_signal(path, retries=1, timeout=0.1):
    last_err = None
    logger = logging.getLogger("server." + __name__)
    logger.debug("Loading the file from {}".format(path))
    for _ in range(retries):
        try:
            signal, meta = load_xml_schiller(path, ["signal", "meta"])
        except Exception as err:
            logger.debug("Loading failed, retrying after {} seconds".format(timeout))
            last_err = err
            time.sleep(timeout)
        else:
            signal, meta = _convert_units(signal, meta, "mV")
            signal = signal.tolist()
            meta["units"] = meta["units"].tolist()
            meta["signame"] = meta["signame"].tolist()
            logger.debug("Loading finished")
            return signal, meta
    else:
        raise last_err


def load_data(path, retries=1, timeout=0.1):
    signal, meta = _load_signal(path, retries, timeout)
    sha = sha256_checksum(path)
    signal_data = {
        "file_name": os.path.basename(path),
        "modification_time": os.path.getmtime(path),
        "signal": signal,
        "meta": meta,
        "annotation": [],
    }
    return sha, signal_data
