$graphvizPath = "C:\Users\weikh\graphviz_cmake\Graphviz-13.1.1-win64\bin"
$terraformPath = "C:\Users\weikh\AppData\Local\Microsoft\WinGet\Packages\Hashicorp.Terraform_Microsoft.Winget.Source_8wekyb3d8bbwe"
$pythonPath = "C:\Users\weikh\python311"
$pythonScripts = "C:\Users\weikh\python311\Scripts"

$existingPath = [System.Environment]::GetEnvironmentVariable("PATH", "Process")
$newPath = "$graphvizPath;$terraformPath;$pythonPath;$pythonScripts;$existingPath"
[System.Environment]::SetEnvironmentVariable("PATH", $newPath, "Process")

Write-Host "Verifying binaries in PATH:"
Get-Command dot.exe | Select-Object -ExpandProperty Source
Get-Command terraform.exe | Select-Object -ExpandProperty Source
Get-Command terravision.exe | Select-Object -ExpandProperty Source

Write-Host "Running terravision draw..."
& "$pythonScripts\terravision.exe" draw --source backend --outfile terravision-architecture.png --format png

Write-Host "Running terravision visualise..."
& "$pythonScripts\terravision.exe" visualise --source backend --outfile terravision-architecture.html

Write-Host "Running terravision drawio..."
& "$pythonScripts\terravision.exe" draw --source backend --outfile terravision-architecture.drawio --format drawio
