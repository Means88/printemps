"""Stop a task if its owning Electron process disappears, including a forced quit."""
import os
import threading


def watch_parent():
    value = os.environ.get('PRINTEMPS_PARENT_PID')
    if not value:
        return  # Standalone command-line workers retain their existing behavior.
    parent = int(value)
    if parent <= 0:
        raise ValueError('Invalid parent process')

    def monitor():
        if os.name == 'nt':
            import ctypes
            from ctypes import wintypes
            kernel = ctypes.WinDLL('kernel32', use_last_error=True)
            kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
            kernel.OpenProcess.restype = wintypes.HANDLE
            kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
            kernel.WaitForSingleObject.restype = wintypes.DWORD
            kernel.CloseHandle.argtypes = [wintypes.HANDLE]
            handle = kernel.OpenProcess(0x00100000, False, parent)  # SYNCHRONIZE only
            if not handle:
                os._exit(1)
            try:
                kernel.WaitForSingleObject(handle, 0xFFFFFFFF)
                os._exit(1)
            finally:
                kernel.CloseHandle(handle)
        else:
            # Parent identity changes to the reaper when the owner dies; no PID-reuse race.
            while os.getppid() == parent:
                threading.Event().wait(0.25)
            os._exit(1)

    threading.Thread(target=monitor, name='printemps-parent', daemon=True).start()
