Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\public\icons"
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Icon([int]$size, [string]$file, [float]$contentScale, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $brandA = [System.Drawing.ColorTranslator]::FromHtml("#0F766E")
  $brandB = [System.Drawing.ColorTranslator]::FromHtml("#064E3B")
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $brandA, $brandB, 45.0)

  if ($rounded) {
    $bgPath = New-RoundedPath 0 0 $size $size ([float]($size * 0.22))
    $g.FillPath($gradient, $bgPath)
    $bgPath.Dispose()
  } else {
    $g.FillRectangle($gradient, $rect)
  }

  $cx = $size / 2.0
  $cy = $size / 2.0
  $s = $size * $contentScale
  $g.TranslateTransform($cx, $cy)
  $g.ScaleTransform($s, $s)

  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $amber = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#FCD34D"))

  $roof = New-Object System.Drawing.Drawing2D.GraphicsPath
  $roof.AddPolygon(@(
    (New-Object System.Drawing.PointF(-0.36, 0.03)),
    (New-Object System.Drawing.PointF(0.0, -0.30)),
    (New-Object System.Drawing.PointF(0.36, 0.03))
  ))
  $g.FillPath($white, $roof)

  $body = New-RoundedPath ([float]-0.27) ([float]0.01) ([float]0.54) ([float]0.34) ([float]0.045)
  $g.FillPath($white, $body)

  $g.FillEllipse($amber, [float]-0.10, [float]0.09, [float]0.20, [float]0.20)
  $inner = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0F766E"))
  $g.FillEllipse($inner, [float]-0.055, [float]0.135, [float]0.11, [float]0.11)

  $g.Dispose()
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $gradient.Dispose()
  $white.Dispose()
  $amber.Dispose()
  $inner.Dispose()
  $roof.Dispose()
  $body.Dispose()
}

New-Icon 192 (Join-Path $outDir "icon-192.png") 0.58 $true
New-Icon 512 (Join-Path $outDir "icon-512.png") 0.58 $true
New-Icon 512 (Join-Path $outDir "icon-maskable-512.png") 0.46 $false
New-Icon 180 (Join-Path $outDir "apple-touch-icon.png") 0.58 $true

Write-Output "Icons written to $outDir"
