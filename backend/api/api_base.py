import logging

from flask import request
from flask_socketio import Namespace


class BaseNamespace(Namespace):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.n_connected = 0
        self.logger = logging.getLogger("server." + __name__)

    def on_connect(self):
        self.logger.info("User connected {}".format(request.sid))
        self.n_connected += 1

    def on_disconnect(self):
        self.logger.info("User disconnected {}".format(request.sid))
        self.n_connected -= 1

    def _safe_call(self, method, data, meta, event_in, event_out=None):
        self.logger.info("Handling event {}. Data: {}. Meta: {}.".format(event_in, data, meta))
        try:
            payload = method(data, meta)
            if event_out is not None:
                self.emit(event_out, payload)
                self.logger.info("Sending response {}. Meta: {}".format(event_out, meta))
        except Exception as error:
            self.emit("ERROR", str(error))
            self.logger.exception(error)
