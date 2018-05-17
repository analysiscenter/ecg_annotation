Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "python ..\install.py", 1, true
script_dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
lnk_path = WshShell.SpecialFolders("Desktop") & "\CardioClick.lnk"
Set lnk = WshShell.CreateShortcut(lnk_path)
lnk.WorkingDirectory = script_dir
lnk.TargetPath = script_dir & "\run.vbs"
lnk.IconLocation = script_dir & "\..\..\frontend\public\logo.ico"
lnk.Save
