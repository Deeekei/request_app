import base64
from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid01

vapid = Vapid01()
vapid.generate_keys()

# Публичный ключ в "сырых" байтах EC point
public_key_bytes = vapid.public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint,
)

# Base64url без "=" на конце — формат, который нужен для Web Push
public_key_b64 = base64.urlsafe_b64encode(public_key_bytes).rstrip(b"=").decode("utf-8")

print("PUBLIC KEY:")
print(public_key_b64)

# Приватный ключ в PEM
private_key_pem = vapid.private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
).decode("utf-8")

print()
print("PRIVATE KEY PEM:")
print(private_key_pem)