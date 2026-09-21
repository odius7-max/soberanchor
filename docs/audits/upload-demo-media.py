"""Upload explicitly authorized synthetic fixtures; never print credentials."""
import json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

root = Path(__file__).resolve().parents[2]
env = {}
for line in (root / '.env.local').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        env[key.strip()] = value.strip().strip('\"\'')
base = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
key = env['SUPABASE_SERVICE_ROLE_KEY']
directory = Path(__file__).parent / 'demo-media'
ledger = []
for path in sorted(directory.iterdir()):
    if path.suffix not in ('.jpg', '.png'):
        continue
    name = 'demo/' + path.name
    data = path.read_bytes()
    assert len(data) < 100000
    request = Request(base + '/storage/v1/object/facility-media/' + name,
                      data=data, method='POST', headers={
                          'Authorization': 'Bearer ' + key,
                          'apikey': key,
                          'Content-Type': 'image/png' if path.suffix == '.png' else 'image/jpeg',
                          'x-upsert': 'false',
                      })
    try:
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read())
            record = {'bucket': 'facility-media', 'key': name, 'bytes': len(data),
                      'status': response.status, 'object_id': result.get('Id'),
                      'public_url': base + '/storage/v1/object/public/facility-media/' + name}
            ledger.append(record)
            (directory / 'upload-ledger.json').write_text(json.dumps(ledger, indent=2))
            print(json.dumps(record), flush=True)
    except HTTPError as error:
        print(json.dumps({'key': name, 'status': error.code, 'error': error.read().decode()}), flush=True)
        raise SystemExit(1)
