#!/usr/bin/env python3
"""Verify exact packaged bytes and actually execute the standalone verifier."""
import json
import os
import re
import subprocess
import sys
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile, ZIP_STORED
from build_offline_verifier import NAME, FORMAT, build, digest, expected_files, make_bundle
from verify_capsule import rebind, wire, require


def check_package(archive, pin_path):
    data=archive.read_bytes()
    pin=digest(data)
    require(pin_path.read_bytes()==(pin+'\n').encode('ascii'))
    require(data==make_bundle()==make_bundle())
    with TemporaryDirectory() as d:
        rebuilt=Path(d)/'rebuilt';require(build(rebuilt)==pin)
        require((rebuilt/NAME).read_bytes()==data)
    expected=expected_files()
    with ZipFile(archive) as z:
        require(z.testzip() is None and z.namelist()==sorted([*expected,'MANIFEST.json']))
        for info in z.infolist():
            require(info.date_time==(1980,1,1,0,0,0) and info.compress_type==ZIP_STORED and info.external_attr==0o100644<<16)
        manifest=json.loads(z.read('MANIFEST.json'))
        require(manifest==dict(format=FORMAT,files={n:digest(b) for n,b in expected.items()}))
        for n,b in expected.items():require(z.read(n)==b)
    print('PACKAGED',len(data),'bytes',pin,'exact source manifest and deterministic rebuild verified')


def challenge(archive,current_path,current_pin,old_path,old_pin):
    archive=archive.resolve();current=current_path.read_bytes();old=old_path.read_bytes();pin=current_pin.read_text('ascii').strip();op=old_pin.read_text('ascii').strip()
    require(digest(current)==pin and digest(old)==op)
    with TemporaryDirectory() as d:
        cwd=Path(d);shadow=cwd/'shadow';shadow.mkdir();(shadow/'verify_capsule.py').write_text('raise RuntimeError("must not import PYTHONPATH")\n',encoding='utf-8')
        env=dict(os.environ,PYTHONPATH=str(shadow))
        def run(data,pin_value,expected_status,expected_reason=None,conclusion=None,pin_file=None,missing=False):
            capsule=cwd/'capsule.json';capsule.write_bytes(data)
            args=[sys.executable,'-I','-S',str(archive),str(cwd/'absent.json' if missing else capsule)]
            if pin_file is not None:
                p=cwd/'pin.sha256';p.write_bytes(pin_file);args+=['--pin-file',str(p)]
            else:args+=['--pin',pin_value]
            proc=subprocess.run(args,cwd=cwd,env=env,capture_output=True,text=True,timeout=20)
            require(proc.returncode==expected_status and not proc.stderr)
            result=json.loads(proc.stdout)
            require(result['status']==('VERIFIED' if expected_status==0 else 'REFUSED'))
            if expected_reason:require(result.get('reason')==expected_reason)
            if conclusion:require(result.get('conclusion')==conclusion)
            return result
        run(current,pin,0,conclusion='REFUTED',pin_file=(pin+'\n').encode('ascii'))
        run(current,pin,0,conclusion='REFUTED')
        match=re.search(rb'[01]/1',current);require(match is not None)
        tampered=bytearray(current);i=match.start();tampered[i]=49 if tampered[i]==48 else 48
        require(sum(a!=b for a,b in zip(current,tampered))==1)
        run(bytes(tampered),pin,1,'PIN_MISMATCH')
        run(current,pin,0,conclusion='REFUTED')
        run(old,pin,1,'PIN_MISMATCH');run(old,op,0,conclusion='SUPPORTED')
        envelope=wire(current.decode('utf-8'),4);payload=wire(envelope['payloadText']);bad=deepcopy(payload);bad['state']['result']['claims']['target']['state']='SUPPORTED'
        forged,forged_pin=rebind(deepcopy(envelope),bad);run(forged,forged_pin,1,'REPLAY_MISMATCH')
        run(current,pin,1,'PIN_REQUIRED',pin_file=(pin+'\nX').encode('ascii'))
        run(current,pin,1,'PIN_REQUIRED',pin_file=b'\xff')
        run(current,pin,2,'INPUT_UNAVAILABLE',missing=True)
        proc=subprocess.run([sys.executable,'-I','-S',str(archive),str(cwd/'capsule.json')],cwd=cwd,env=env,capture_output=True,text=True,timeout=20)
        require(proc.returncode==2)
    print('OFFLINE: exact browser capsule verified, one-byte tamper refused, original restored, old-pin counterexample preserved, forged semantics refused, strict external pin and missing input controls passed')


def main():
    args=sys.argv[1:]
    if len(args)==3 and args[0]=='--build-only':
        check_package(Path(args[1]),Path(args[2]));return
    if len(args)!=6:raise SystemExit('usage: test_offline_verifier.py ARCHIVE ARCHIVE_PIN CURRENT CURRENT_PIN OLD OLD_PIN')
    archive,pin,current,current_pin,old,old_pin=map(Path,args)
    check_package(archive,pin);challenge(archive,current,current_pin,old,old_pin)


if __name__=='__main__':main()
