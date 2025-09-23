import logging
from typing import Dict

import jwt
import requests
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()


class AzureADValidator:
    def __init__(self):
        self.tenant_id = getattr(settings, "azure_tenant_id", None) or ""
        self.client_id = getattr(settings, "azure_client_id", None) or ""
        self.issuer = f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"
        self.openid_config_url = f"{self.issuer}/.well-known/openid-configuration"
        self._jwks = None

    def _get_jwks(self) -> Dict:
        if not self._jwks:
            openid_config = requests.get(self.openid_config_url, timeout=10).json()
            jwks_uri = openid_config["jwks_uri"]
            self._jwks = requests.get(jwks_uri, timeout=10).json()
        return self._jwks

    def validate_token(self, token: str) -> Dict:
        try:
            keys = self._get_jwks()
            unverified_header = jwt.get_unverified_header(token)

            rsa_key = next((k for k in keys.get("keys", []) if k.get("kid") == unverified_header.get("kid")), None)
            if not rsa_key:
                raise HTTPException(status_code=401, detail="Unable to find signing key")

            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(rsa_key)

            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer,
            )

            return {
                "username": payload.get("preferred_username") or payload.get("unique_name"),
                "name": payload.get("name"),
                "email": payload.get("email") or payload.get("preferred_username"),
                "sub": payload.get("sub"),
            }
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


validator = AzureADValidator()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    return validator.validate_token(credentials.credentials)


