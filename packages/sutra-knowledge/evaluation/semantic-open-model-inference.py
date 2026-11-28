"""Bounded actual CPU inference on public data only; no remote model execution."""
import os, sys, json, time, hashlib, pathlib, resource
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"]="1"
os.environ["HF_HUB_DISABLE_TELEMETRY"]="1"
os.environ["TOKENIZERS_PARALLELISM"]="false"
os.environ["HF_HUB_DISABLE_XET"]="1"
from huggingface_hub import HfApi, snapshot_download
import torch
import transformers
from transformers import AutoTokenizer, AutoModelForCausalLM
root=pathlib.Path(sys.argv[1])
repo="HuggingFaceTB/SmolLM2-360M-Instruct"
prefix="a10cc15"
started=time.monotonic()
meta=HfApi().model_info(repo,revision=prefix,token=False)
if not meta.sha or not meta.sha.startswith(prefix) or len(meta.sha)!=40: raise RuntimeError("MODEL_REVISION")
path=pathlib.Path(snapshot_download(repo,revision=meta.sha,token=False,allow_patterns=["config.json","generation_config.json","tokenizer.json","tokenizer_config.json","special_tokens_map.json","model.safetensors","vocab.json","merges.txt","LICENSE"]))
os.environ["HF_HUB_OFFLINE"]="1"
def sha(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
 return h.hexdigest()
files={p.name:{"bytes":p.stat().st_size,"sha256":sha(p)} for p in path.iterdir() if p.is_file()}
if "model.safetensors" not in files: raise RuntimeError("WEIGHT_FILE")
torch.set_num_threads(2)
torch.manual_seed(0)
tokenizer=AutoTokenizer.from_pretrained(path,trust_remote_code=False,local_files_only=True)
model=AutoModelForCausalLM.from_pretrained(path,trust_remote_code=False,local_files_only=True,use_safetensors=True,torch_dtype=torch.float32).eval()
load_ms=(time.monotonic()-started)*1000
prompts=[json.loads(l) for l in (root/"prompts.jsonl").read_text().splitlines()]
if len(prompts)>32 or any(p["maxNewTokens"]>220 for p in prompts): raise RuntimeError("PILOT_BOUND")
with open(root/"generations.jsonl","w",encoding="utf-8") as out:
 for p in prompts:
  inputs=tokenizer.apply_chat_template([{"role":"system","content":p["system"]},{"role":"user","content":p["user"]}],add_generation_prompt=True,tokenize=True,return_tensors="pt",return_dict=True)
  n=inputs["input_ids"].shape[-1]
  if n>2048: raise RuntimeError("INPUT_BOUND")
  t=time.monotonic()
  with torch.inference_mode():
   seq=model.generate(**inputs,do_sample=False,max_new_tokens=p["maxNewTokens"],pad_token_id=tokenizer.eos_token_id)
  generated=seq[0,n:]
  result={"id":p["id"],"arm":p["arm"],"text":tokenizer.decode(generated,skip_special_tokens=True),"inputTokens":int(n),"generatedTokens":int(generated.numel()),"ms":(time.monotonic()-t)*1000}
  out.write(json.dumps(result,ensure_ascii=False)+"\n");out.flush()
  print(p["id"],p["arm"],result["generatedTokens"],round(result["ms"]),flush=True)
(root/"runtime.json").write_text(json.dumps({"model":repo,"revision":meta.sha,"files":files,"torch":torch.__version__,"transformers":transformers.__version__,"device":"cpu","threads":2,"loadMs":load_ms,"totalMs":(time.monotonic()-started)*1000,"peakRssKiB":resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,"promptSha256":sha(root/"prompts.jsonl"),"generationsSha256":sha(root/"generations.jsonl"),"qualification":"Actual locally generated text; public model weights; no external inference API."},indent=2)+"\n")
