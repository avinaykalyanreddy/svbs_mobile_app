from django.db import models
from django.core.validators import RegexValidator
from django.core.validators import EmailValidator
from django.contrib.auth.hashers import check_password, identify_hasher, make_password


class Users(models.Model):

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('user', 'Normal User'),
    ]

    name = models.CharField(max_length=100)

    mobile_number = models.CharField(
        max_length=10,
        validators=[
            RegexValidator(
                regex=r'^[6-9]\d{9}$',
                message='Enter a valid 10-digit Indian mobile number.'
            )
        ],
        unique=True
    )

    email = models.EmailField(
        max_length=254,
        unique=True,
        validators=[EmailValidator()]
    )

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='user'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    aadhar_number = models.CharField(
        max_length=12,
        validators=[
            RegexValidator(
                regex=r'^\d{12}$',
                message='Aadhaar number must contain exactly 12 digits.'
            )
        ],
        unique=True
    )
    password = models.CharField(max_length=128)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def save(self, *args, **kwargs):
        # Hash plain values entered through Django admin or other model code.
        try:
            identify_hasher(self.password)
        except (TypeError, ValueError):
            self.set_password(self.password)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name