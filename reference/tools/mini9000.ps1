$ErrorActionPreference='Continue'
Add-Type -AssemblyName System.Net.Http
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:9000/')
$listener.AuthenticationSchemes = [System.Net.AuthenticationSchemes]::Anonymous
$listener.Start()
function Json($obj){ return ($obj | ConvertTo-Json -Depth 8) }
function WriteJson($ctx,$obj){ $bytes = [System.Text.Encoding]::UTF8.GetBytes((Json $obj)); $ctx.Response.ContentType = 'application/json'; $ctx.Response.ContentEncoding = [System.Text.Encoding]::UTF8; $ctx.Response.StatusCode = 200; $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length); $ctx.Response.Close() }
function Bad($ctx,$msg){ $bytes = [System.Text.Encoding]::UTF8.GetBytes((Json @{ error=$msg })); $ctx.Response.StatusCode = 400; $ctx.Response.ContentType='application/json'; $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length); $ctx.Response.Close() }
function Ok($ctx){ WriteJson $ctx @{ ok=$true } }
function ComfyGet($path){ try { return Invoke-RestMethod -Uri ('http://127.0.0.1:8188'+$path) -Method Get -TimeoutSec 20 } catch { return $null } }
function ComfyPost($path,$body){ try { return Invoke-RestMethod -Uri ('http://127.0.0.1:8188'+$path) -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 30 } catch { return $null } }
function PromptRun($image,$prefix){ $json = @{ client_id='AIGC-LINK-001'; prompt=@{ '3'=@{ _meta=@{ title='加载图像' }; class_type='LoadImage'; inputs=@{ image=$image } }; '86'=@{ _meta=@{ title='RMBG' }; class_type='RMBG'; inputs=@{ background='white'; image=@('3',0); invert_output=$false; mask_blur=0; mask_offset=0; model='RMBG-2.0'; optimize='default'; process_res=1024; refine_foreground=$false; sensitivity=1 } }; '101'=@{ _meta=@{ title='保存图像' }; class_type='SaveImage'; inputs=@{ images=@('86',0); filename_prefix=$prefix } } } } | ConvertTo-Json -Depth 8; $r = ComfyPost '/prompt' $json; if(-not $r){ return @{ ok=$false } }; $pid = $r.prompt_id; $file=''; for($i=0;$i -lt 10;$i++){ Start-Sleep -Milliseconds 500; $h = ComfyGet ('/history/'+$pid); if($h){ $obj = $h.$pid; if($obj -and $obj.outputs -and $obj.outputs.'101' -and $obj.outputs.'101'.images){ $file = $obj.outputs.'101'.images[0].filename; break } } }; return @{ ok=$true; prompt_id=$pid; output=$file }
}
while($true){ $ctx = $listener.GetContext(); $req = $ctx.Request; $path = $req.Url.AbsolutePath; $meth = $req.HttpMethod; if($meth -eq 'GET' -and $path -like '/status*'){ $k = ComfyGet '/object_info/KSampler'; $l = ComfyGet '/object_info/LoadImage'; $p = ComfyGet '/object_info/PreviewImage'; $r = ComfyGet '/object_info/RMBG'; WriteJson $ctx @{ comfy=$true; object_info=@{ KSampler=[bool]$k; LoadImage=[bool]$l; PreviewImage=[bool]$p; RMBG=[bool]$r } } ; continue }
 if($meth -eq 'GET' -and $path -like '/history/*'){ $pid = $path.Substring(9); $h = ComfyGet ('/history/'+$pid); if($h){ WriteJson $ctx $h } else { Bad $ctx 'history_unavailable' }; continue }
 if($meth -eq 'GET' -and $path -like '/run/*'){ $image = $path.Substring(5); $res = PromptRun $image 'AIGC_LINK'; WriteJson $ctx $res; continue }
 if($meth -eq 'POST' -and $path -eq '/'){ try { $body = New-Object IO.StreamReader($req.InputStream,$req.ContentEncoding); $text = $body.ReadToEnd(); $obj = $null; if($text){ $obj = $text | ConvertFrom-Json } } catch { $obj = $null }; if($obj -and $obj.action -eq 'run' -and $obj.image){ $prefix = if($obj.prefix){ $obj.prefix } else { 'AIGC_LINK' }; $res = PromptRun $obj.image $prefix; WriteJson $ctx $res } else { Ok $ctx }; continue }
 Bad $ctx 'route_not_found'
}