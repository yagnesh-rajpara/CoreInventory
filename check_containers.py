import json
import subprocess
try:
    out = subprocess.check_output(['docker', 'inspect', 'coreinventory-db-1', 'coreinventory-backend-1', 'coreinventory-frontend-1'])
    data = json.loads(out)
    for c in data:
        status = c['State']['Status']
        health = c['State'].get('Health', {}).get('Status', 'N/A')
        print(f"{c['Name']}: Status={status}, Health={health}")
except Exception as e:
    print(f"Error: {e}")
