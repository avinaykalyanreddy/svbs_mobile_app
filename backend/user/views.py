import hmac

from django.contrib.auth.hashers import check_password
from django.core import signing
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Users
from .serializers import LoginSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    identifier = serializer.validated_data['identifier']
    password = serializer.validated_data['password']
    lookup = Q(email__iexact=identifier) if '@' in identifier else Q(mobile_number=identifier)
    user = Users.objects.filter(lookup).first()

    # Accept old plain-text records once, then upgrade them to Django's password hash.
    valid_password = bool(user and check_password(password, user.password))
    if user and not valid_password and hmac.compare_digest(user.password, password):
        user.set_password(password)
        user.save(update_fields=['password'])
        valid_password = True

    if not user or not valid_password:
        return Response({'detail': 'The email/mobile number or password is incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)

    return Response({
        'id': user.pk,
        'token': signing.dumps({'user_id': user.pk}, salt='svbs.chat.auth'),
        'name': user.name,
        'email': user.email,
        'mobile_number': user.mobile_number,
        'aadhaar_masked': f'XXXXXX{user.aadhar_number[-6:]}',
        'role': user.role,
    }, status=status.HTTP_200_OK)
