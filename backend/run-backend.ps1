$envFile = "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^[^#]" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Item -Path "Env:\$name" -Value $value
    }
    Write-Host "Loaded environment variables from .env"
} else {
    Write-Warning ".env file not found in the parent directory."
}

# Auto-detect and set Java 21 if JAVA_HOME is pointing to older JDK
$jdk21 = Get-ChildItem "C:\Program Files\Java\jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if ($jdk21) {
    $env:JAVA_HOME = $jdk21
    Write-Host "Configured JAVA_HOME -> $jdk21"
}

$mvnCmd = if (Get-Command mvn -ErrorAction SilentlyContinue) {
    "mvn"
} else {
    $found = Get-ChildItem -Recurse -Filter "mvn.cmd" "$HOME\.m2\wrapper" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if ($found) { $found } else { "mvn" }
}

& $mvnCmd spring-boot:run
