import os
import subprocess


def run(path, cmd):
    os.chdir(path)
    subprocess.run(cmd, shell=True)


def main():
    root_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

    # frontend
    print("Installing frontend dependencies")
    path = os.path.join(root_path, "frontend")
    cmd = "yarn install"
    run(path, cmd)
    cmd = "yarn build"
    run(path, cmd)
    print()

    # backend
    print("Installing backend dependencies")
    path = os.path.join(root_path, "backend")
    cmd = "pip install -r requirements.txt"
    run(path, cmd)
    print()

    input("Press Enter to continue...")


if __name__ == "__main__":
    main()
