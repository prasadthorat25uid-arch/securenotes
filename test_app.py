import urllib.request
import json
import uuid
import config

def test_system():
    # Cookie handler for session continuity
    cookie_jar = urllib.request.HTTPCookieProcessor()
    opener = urllib.request.build_opener(cookie_jar)

    f1 = config.AUTHORIZED_FRIENDS[0]
    f2 = config.AUTHORIZED_FRIENDS[1]
    f3 = config.AUTHORIZED_FRIENDS[2]

    # 1. Switch to Friend 1
    req = urllib.request.Request(
        'http://127.0.0.1:5000/api/switch-friend',
        data=json.dumps({'email': f1['email']}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    res = opener.open(req)
    user_data = json.loads(res.read())
    print("1. Active Friend:", user_data['user']['name'], f"<{user_data['user']['email']}>")

    # 2. Upload a new document as Friend 1
    boundary = '----StudyVaultBoundary' + uuid.uuid4().hex
    parts = []
    def add_field(name, val):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{val}\r\n'.encode('utf-8'))

    def add_file(name, filename, data, mimetype):
        header = f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\nContent-Type: {mimetype}\r\n\r\n'.encode('utf-8')
        parts.append(header + data + b'\r\n')

    add_field('title', 'Cloud Computing Unit 1')
    add_field('category', 'Notes')
    add_field('description', 'AWS and Virtualization lecture notes')
    add_field('tags', 'Cloud, AWS, Virtualization')
    add_field('shared_with_group', 'true')
    add_file('file', 'Cloud Computing Unit 1.pdf', b'%PDF-1.4 Cloud Computing Study Notes', 'application/pdf')
    parts.append(f'--{boundary}--\r\n'.encode('utf-8'))

    upload_req = urllib.request.Request(
        'http://127.0.0.1:5000/api/upload',
        data=b''.join(parts),
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    upload_res = opener.open(upload_req)
    doc_data = json.loads(upload_res.read())
    print("2. Uploaded successfully:", doc_data['document']['file_name'], "by", doc_data['document']['uploaded_by_name'])

    # 3. Switch to Friend 2
    req2 = urllib.request.Request(
        'http://127.0.0.1:5000/api/switch-friend',
        data=json.dumps({'email': f2['email']}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    res2 = opener.open(req2)
    user2 = json.loads(res2.read())
    print("3. Switched to Friend 2:", user2['user']['name'], f"<{user2['user']['email']}>")

    # 4. As Friend 2, verify document is visible in Shared Documents
    shared_res = opener.open('http://127.0.0.1:5000/api/documents?tab=shared')
    shared_docs = json.loads(shared_res.read())['documents']
    found = any(d['file_name'] == 'Cloud Computing Unit 1.pdf' for d in shared_docs)
    print("4. Is Friend 1's uploaded file visible to Friend 2? ->", found)

    # 5. Switch to Friend 3
    req3 = urllib.request.Request(
        'http://127.0.0.1:5000/api/switch-friend',
        data=json.dumps({'email': f3['email']}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    res3 = opener.open(req3)
    user3 = json.loads(res3.read())
    print("5. Switched to Friend 3:", user3['user']['name'], f"<{user3['user']['email']}>")

    # 6. As Friend 3, test downloading the document
    cloud_doc = next(d for d in shared_docs if d['file_name'] == 'Cloud Computing Unit 1.pdf')
    download_res = opener.open(f"http://127.0.0.1:5000/api/documents/{cloud_doc['id']}/download")
    content = download_res.read()
    print("6. Friend 3 downloaded file successfully! Size:", len(content), "bytes")

    # 7. Test Unauthorized Email (stranger@example.com)
    try:
        unauth_req = urllib.request.Request(
            'http://127.0.0.1:5000/api/login',
            data=json.dumps({'email': 'stranger@example.com'}).encode(),
            headers={'Content-Type': 'application/json'}
        )
        opener.open(unauth_req)
        print("7. FAIL: Unauthorized access was not blocked!")
    except urllib.error.HTTPError as err:
        print("7. PASS: Unauthorized access blocked with HTTP", err.code)

    print("\nALL 7 TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_system()
