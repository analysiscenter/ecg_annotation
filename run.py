import os
import socket
import subprocess


def is_open_port(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("", port))
    except OSError as e:
        print(e)
        return True
    sock.close()
    return False


def run(path, cmd):
    os.chdir(path)
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True)


def main():
    script_path = os.path.dirname(os.path.abspath(__file__))

    # frontend
    path = os.path.join(script_path, "frontend")
    cmd = "yarn el:start"
    run(path, cmd)

    # backend
    if not is_open_port(9090):
        path = script_path
        cmd = "python {}".format(os.path.join(".", "backend", "server.py"))
        run(path, cmd)


if __name__ == "__main__":
    main()
