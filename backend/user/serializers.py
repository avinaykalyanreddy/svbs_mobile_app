import re

from django.core.validators import validate_email
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254, trim_whitespace=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False, allow_blank=False)

    def validate_identifier(self, value):
        value = value.strip()
        if '@' in value:
            try:
                validate_email(value)
            except Exception as exc:
                raise serializers.ValidationError('Enter a valid email address or 10-digit mobile number.') from exc
            return value.lower()

        mobile = re.sub(r'[\s()-]', '', value)
        if mobile.startswith('+91'):
            mobile = mobile[3:]
        if not re.fullmatch(r'[6-9]\d{9}', mobile):
            raise serializers.ValidationError('Enter a valid email address or 10-digit mobile number.')
        return mobile
