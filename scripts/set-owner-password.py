"""Run locally in Terminal; password input is hidden and never saved to disk."""
import getpass
import json
import subprocess
import sys
import urllib.request
import urllib.error

PROJECT = 'ucwtbyglnlsngvcejonu'
USER = '40ebe3c8-4dd6-4c66-b49a-f593c1617054'

def main():
    if not sys.stdin.isatty():
        raise RuntimeError('Run this directly in your Terminal so password entry can stay hidden.')
    password = getpass.getpass('Choose your BOMedia admin password (12+ characters): ')
    if len(password) < 12:
        raise RuntimeError('Please choose at least 12 characters.')
    if password != getpass.getpass('Confirm password: '):
        raise RuntimeError('Passwords did not match; nothing changed.')
    result = subprocess.run(['npx', '--yes', 'supabase', 'projects', 'api-keys', '--project-ref', PROJECT, '--reveal', '--output', 'json'], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Supabase CLI access failed. Run npx supabase login and try again.')
    parsed = json.loads(result.stdout)
    keys = parsed if isinstance(parsed, list) else parsed.get('api_keys', parsed.get('keys', []))
    key = next((k for k in keys if k.get('name') == 'service_role'), None) or next((k for k in keys if k.get('type') == 'secret'), None)
    if not key:
        raise RuntimeError('Could not obtain authorized account-management access.')
    secret = key.get('api_key') or key.get('key')
    headers = {'apikey': secret, 'Content-Type': 'application/json'}
    if secret.startswith('eyJ'):
        headers['Authorization'] = 'Bearer ' + secret
    request = urllib.request.Request('https://' + PROJECT + '.supabase.co/auth/v1/admin/users/' + USER,
        data=json.dumps({'password': password, 'email_confirm': True}).encode(), headers=headers, method='PUT')
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status != 200:
                raise RuntimeError('Password update was not confirmed.')
    except urllib.error.HTTPError:
        raise RuntimeError('Supabase rejected the update. No account details have been printed.') from None
    print('Password set. You can sign in to BOMedia with elijahfasugba@gmail.com.')

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
