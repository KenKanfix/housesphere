Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root "housesphere.png"
if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Source icon not found: $sourcePath"
}

$outDir = Join-Path $root "public\icons"
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)

function Get-CornerColor([System.Drawing.Bitmap]$image) {
  $points = @(
    @(4, 4),
    @(($image.Width - 5), 4),
    @(4, ($image.Height - 5)),
    @(($image.Width - 5), ($image.Height - 5))
  )
  $r = 0; $g = 0; $b = 0
  foreach ($point in $points) {
    $color = $image.GetPixel($point[0], $point[1])
    $r += $color.R; $g += $color.G; $b += $color.B
  }
  $count = $points.Count
  return [System.Drawing.Color]::FromArgb(255, [int]($r / $count), [int]($g / $count), [int]($b / $count))
}

$background = Get-CornerColor $source

function New-Icon([int]$size, [string]$file, [double]$contentScale) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear($background)

  $drawSize = [int][Math]::Round($size * $contentScale)
  $offset = [int](($size - $drawSize) / 2)
  $rect = New-Object System.Drawing.Rectangle($offset, $offset, $drawSize, $drawSize)
  $graphics.DrawImage($source, $rect)

  $graphics.Dispose()
  $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

New-Icon 192 (Join-Path $outDir "icon-192.png") 1.0
New-Icon 512 (Join-Path $outDir "icon-512.png") 1.0
New-Icon 512 (Join-Path $outDir "icon-maskable-512.png") 0.82
New-Icon 180 (Join-Path $outDir "apple-touch-icon.png") 1.0
New-Icon 32 (Join-Path $root "public\favicon-32.png") 1.0

$source.Dispose()
Write-Output "Icons written to $outDir from $sourcePath"

$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
  & $python.Source (Join-Path $PSScriptRoot "optimize-icons.py")
}
