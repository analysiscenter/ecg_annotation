import os
import json
import logging
import logging.config
import argparse

from flask import Flask
from flask_socketio import SocketIO


def create_logger(logger_config_path):
    with open(logger_config_path, encoding="utf-8") as logger_config:
        logger_config = json.load(logger_config)
    logging.config.dictConfig(logger_config)
    logger = logging.getLogger("server")
    return logger


def get_config(path, required_keys):
    with open(path, encoding="utf-8") as server_config:
        server_config = json.load(server_config)
    key_diff = set(server_config) - required_keys
    if key_diff:
        raise KeyError("{} keys are not found in the server config".format(sorted(key_diff)))
    return server_config


def parse_demo_args(args):
    REQUIRED_KEYS = {"logger_config"}
    server_config = get_config(args.config, REQUIRED_KEYS)
    logger = create_logger(server_config["logger_config"])
    logger.info("Creating demo namespace")
    from api.demo.api import DemoNamespace as Namespace
    namespace = Namespace("/api")
    logger.info("Namespace created")
    return namespace, logger


def parse_annotation_args(args):
    REQUIRED_KEYS = {
        "watch_dir",
        "dump_dir",
        "annotation_list_path",
        "annotation_count_path",
        "submitted_annotation_path",
        "logger_config",
    }
    server_config = get_config(args.config, REQUIRED_KEYS)
    logger = create_logger(server_config["logger_config"])
    logger.info("Creating annotation namespace")
    from api.annotation.api import AnnotationNamespace as Namespace
    namespace = Namespace(server_config["watch_dir"], server_config["dump_dir"],
                          server_config["annotation_list_path"], server_config["annotation_count_path"],
                          server_config["submitted_annotation_path"], "/api")
    logger.info("Namespace created")
    return namespace, logger


def parse_args():
    parser = argparse.ArgumentParser(description="A backend for an ECG/CT demo and an ECG annotation tool.")
    subparsers = parser.add_subparsers(dest="launch_mode")
    subparsers.required = True

    parser_demo = subparsers.add_parser("demo", help="Launch an ECG/CT demo")
    parser_demo.add_argument("-c", "--config", help="A path to a json file with server configuration",
                             default=os.path.join(".", "api", "demo", "server_config.json"))
    parser_demo.set_defaults(parse=parse_demo_args)

    parser_annotation = subparsers.add_parser("annotation", help="Launch an ECG annotation tool")
    parser_annotation.add_argument("-c", "--config", help="A path to a json file with server configuration",
                                   default=os.path.join(".", "api", "annotation", "server_config.json"))
    parser_annotation.set_defaults(parse=parse_annotation_args)

    args = parser.parse_args()
    return args.parse(args)


def main():
    namespace, logger = parse_args()

    app = Flask(__name__)
    socketio = SocketIO(app)
    socketio.on_namespace(namespace)

    logger.info("Server launched")
    socketio.run(app, port=9090)


if __name__ == "__main__":
    main()
