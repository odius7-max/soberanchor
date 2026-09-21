$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$outputDir = Join-Path $PSScriptRoot 'demo-media'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$names = @()
foreach ($n in 1..5) { $names += "0001-$n.jpg" }
foreach ($n in 1..6) { $names += "0002-$n.jpg" }
$names += '0002-logo.png', '0002-staff1.jpg'
foreach ($n in 1..4) { $names += "0003-$n.jpg" }
$names += '0003-logo.png', '0003-staff1.jpg'
foreach ($name in $names) {
  $square = $name -match 'logo|staff'
  $w = if ($square) { 320 } else { 640 }
  $h = if ($square) { 320 } else { 420 }
  $bitmap = [System.Drawing.Bitmap]::new($w, $h)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::FromArgb(25, 93, 111))
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $font = [System.Drawing.Font]::new('Arial', 26, [System.Drawing.FontStyle]::Bold)
  $small = [System.Drawing.Font]::new('Arial', 14)
  $graphics.DrawString('DEMO / TEST', $font, $brush, 22, 65)
  $graphics.DrawString(($name -replace '\.(jpg|png)$',''), $font, $brush, 22, 120)
  $graphics.DrawString('Generic placeholder', $small, $brush, 22, 185)
  $graphics.DrawString('Not a real facility or person', $small, $brush, 22, 215)
  $path = Join-Path $outputDir $name
  $format = if ($name.EndsWith('.png')) { [System.Drawing.Imaging.ImageFormat]::Png } else { [System.Drawing.Imaging.ImageFormat]::Jpeg }
  $bitmap.Save($path, $format)
  $small.Dispose(); $font.Dispose(); $brush.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
  $size = (Get-Item -LiteralPath $path).Length
  if ($size -ge 100000) { throw "Image too large: $name ($size)" }
  Write-Output "$name $size bytes"
}
