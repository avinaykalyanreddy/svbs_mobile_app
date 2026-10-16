from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote, urlparse
from uuid import uuid4

from django.conf import settings
from django.core import signing
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from django.utils import timezone

# Create your views here.
from rest_framework.decorators import api_view
from  rest_framework.response import Response
from rest_framework import status

from user.models import Users
from .models import Ads, AppNotification, BankAndPercentage, BankNames, ChatConversation, ChatMessage, ChatTypingStatus, Percentage, QRPercentage
from .serializers import AdsSerializer, BankAndPercentageSerializer, BankNamesSerializer, PercentageSerializer, QRPercentageSerializer



@api_view(['GET', 'POST'])
def bank_list(request):
    if request.method == 'GET':
        banks = BankNames.objects.all().order_by('name')
        serializer = BankNamesSerializer(banks, many=True)
        return Response(serializer.data)

    serializer = BankNamesSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def bank_detail(request, name):
    bank = get_object_or_404(BankNames, pk=name)
    bank.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def qrpercentage_list(request):
    if request.method == 'GET':
        qr_lists = QRPercentage.objects.all().order_by('-created')
        serializer = QRPercentageSerializer(qr_lists, many=True)
        return Response(serializer.data)

    data = request.data.copy()
    uploaded_image = request.FILES.get('image')
    saved_path = None
    if uploaded_image is not None:
        if not (uploaded_image.content_type or '').startswith('image/'):
            return Response({'image': ['Choose an image file.']}, status=status.HTTP_400_BAD_REQUEST)
        if uploaded_image.size > 10 * 1024 * 1024:
            return Response({'image': ['Image must be 10 MB or smaller.']}, status=status.HTTP_400_BAD_REQUEST)

        extension = Path(uploaded_image.name or '').suffix.lower()
        if extension not in {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'}:
            extension = '.img'
        saved_path = default_storage.save(f'qr_codes/{uuid4().hex}{extension}', uploaded_image)
        data['source'] = request.build_absolute_uri(default_storage.url(saved_path))
        data.pop('image', None)

    serializer = QRPercentageSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    if saved_path:
        default_storage.delete(saved_path)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
def qrpercentage_delete(request, pk):
    qr = get_object_or_404(QRPercentage, pk=pk)
    if request.method == 'PATCH':
        serializer = QRPercentageSerializer(qr, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    media_path = urlparse(settings.MEDIA_URL).path
    source_path = urlparse(qr.source).path
    if source_path.startswith(media_path):
        default_storage.delete(unquote(source_path[len(media_path):]))
    qr.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def ads_list(request):
    if request.method == 'GET':
        ads = Ads.objects.all().order_by('created', 'id')
        return Response(AdsSerializer(ads, many=True).data)

    actor, error = _chat_actor(request, require_admin=True)
    if error:
        return error

    serializer = AdsSerializer(data=request.data)
    if serializer.is_valid():
        ad = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
def ads_detail(request, pk):
    ad = get_object_or_404(Ads, pk=pk)
    if request.method == 'GET':
        return Response(AdsSerializer(ad).data)
    ad.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def card_percentage_list(request):
    if request.method == 'GET':
        groups = Percentage.objects.prefetch_related('bank_assignments__bank').order_by('created', 'percentage')
        data = [{
            'percentage': group.percentage,
            'msg': group.msg,
            'imps': group.imps,
            'created': group.created,
            'banks': [assignment.bank.name for assignment in group.bank_assignments.all()],
        } for group in groups]
        return Response(data)

    serializer = PercentageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
def card_percentage_delete(request, percentage):
    group = get_object_or_404(Percentage, pk=percentage)
    if request.method == 'PATCH':
        serializer = PercentageSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    group.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def card_percentage_add_bank(request, percentage):
    group = get_object_or_404(Percentage, pk=percentage)
    bank_name = request.data.get('bank_name', '').strip()
    if not bank_name:
        return Response({'bank_name': ['Choose a bank name.']}, status=status.HTTP_400_BAD_REQUEST)
    bank = get_object_or_404(BankNames, pk=bank_name)
    assignment, created = BankAndPercentage.objects.get_or_create(bank=bank, percentage=group)
    return Response(BankAndPercentageSerializer(assignment).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['DELETE'])
def card_percentage_remove_bank(request, percentage, bank_name):
    group = get_object_or_404(Percentage, pk=percentage)
    bank = get_object_or_404(BankNames, pk=bank_name)
    assignment = get_object_or_404(BankAndPercentage, bank=bank, percentage=group)
    assignment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


def _chat_actor(request, require_admin=False):
    """Verify the signed login token and resolve the current database user."""
    authorization = request.headers.get('Authorization', '')
    scheme, _, token = authorization.partition(' ')
    if scheme.lower() != 'bearer' or not token:
        return None, Response({'detail': 'Please log in to use chat.'}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        payload = signing.loads(token, salt='svbs.chat.auth', max_age=60 * 60 * 24 * 14)
        actor = Users.objects.get(pk=payload['user_id'])
    except (signing.BadSignature, signing.SignatureExpired, KeyError, TypeError, ValueError, Users.DoesNotExist):
        return None, Response({'detail': 'Your login has expired. Please log in again.'}, status=status.HTTP_401_UNAUTHORIZED)
    if require_admin and actor.role != 'admin':
        return None, Response({'detail': 'Admin access is required.'}, status=status.HTTP_403_FORBIDDEN)
    if not require_admin and actor.role != 'user':
        return None, Response({'detail': 'Customer access is required.'}, status=status.HTTP_403_FORBIDDEN)
    return actor, None


def _message_payload(message, request):
    return {
        'id': message.pk,
        'text': message.text,
        'image': request.build_absolute_uri(message.image.url) if message.image else None,
        'left_face_image': request.build_absolute_uri(message.left_face_image.url) if message.left_face_image else None,
        'right_face_image': request.build_absolute_uri(message.right_face_image.url) if message.right_face_image else None,
        'sender_id': message.sender_id,
        'sender_name': message.sender.name,
        'sender_role': message.sender.role,
        'delivered_to_customer': message.delivered_to_customer,
        'delivered_to_admin': message.delivered_to_admin,
        'read_by_customer': message.read_by_customer,
        'read_by_admin': message.read_by_admin,
        'created_at': message.created_at,
    }


def _validate_chat_content(request):
    text = str(request.data.get('text', '') or '').strip()
    image = request.FILES.get('image')
    left_face_image = request.FILES.get('left_face_image')
    right_face_image = request.FILES.get('right_face_image')
    verification_method = request.data.get('verification_method')
    if not text and image is None and left_face_image is None and right_face_image is None:
        return None, None, None, None, Response({'detail': 'Write a message or attach a photo.'}, status=status.HTTP_400_BAD_REQUEST)
    if verification_method == 'photos' and (left_face_image is None or right_face_image is None):
        return None, None, None, None, Response({'detail': 'Both left-side and right-side face photos are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if verification_method != 'photos' and (left_face_image is not None or right_face_image is not None):
        return None, None, None, None, Response({'detail': 'Face photos require the photos verification option.'}, status=status.HTTP_400_BAD_REQUEST)
    for field_name, photo in (('image', image), ('left_face_image', left_face_image), ('right_face_image', right_face_image)):
        if photo is not None:
            if not (photo.content_type or '').startswith('image/'):
                return None, None, None, None, Response({field_name: ['Only photo files are allowed.']}, status=status.HTTP_400_BAD_REQUEST)
            if photo.size > 10 * 1024 * 1024:
                return None, None, None, None, Response({field_name: ['Photos must be 10 MB or smaller.']}, status=status.HTTP_400_BAD_REQUEST)
    return text, image, left_face_image, right_face_image, None


def _save_chat_message(conversation, actor, request):
    text, image, left_face_image, right_face_image, error = _validate_chat_content(request)
    if error:
        return None, error
    message = ChatMessage(conversation=conversation, sender=actor, text=text)
    if image is not None:
        message.image = image
    if left_face_image is not None:
        message.left_face_image = left_face_image
    if right_face_image is not None:
        message.right_face_image = right_face_image
    if actor.role == 'admin':
        message.read_by_admin = True
    else:
        message.read_by_customer = True
    message.save()
    conversation.save(update_fields=['updated_at'])
    # Save a durable alert for each recipient; the app monitor presents it with sound.
    recipients = Users.objects.filter(role='admin') if actor.role == 'user' else Users.objects.filter(pk=conversation.customer_id)
    AppNotification.objects.bulk_create([
        AppNotification(
            recipient=recipient,
            kind=AppNotification.CHAT,
            title=f'New message from {actor.name}',
            body=(text or ('Photo' if image or left_face_image or right_face_image else 'New chat message'))[:500],
            route=f'/chat?conversationId={conversation.pk}' if recipient.role == 'admin' else '/chat',
            data={'conversation_id': conversation.pk, 'message_id': message.pk},
        )
        for recipient in recipients
    ])
    return message, None


@api_view(['GET', 'POST'])
def user_notifications(request):
    actor, error = _chat_actor(request)
    if error:
        actor, error = _chat_actor(request, require_admin=True)
    if error:
        return error
    # Ads remain on the customer dashboard carousel; only chat alerts use the notification bell.
    notifications = AppNotification.objects.filter(recipient=actor, kind=AppNotification.CHAT)
    if request.method == 'POST':
        # Opening the bell clears unread chat badges while preserving the chat alert history.
        notifications.filter(read_at__isnull=True).update(read_at=timezone.now())
        return Response({'unread_count': 0})
    return Response({
        'unread_count': notifications.filter(read_at__isnull=True).count(),
        'results': [{
            'id': item.pk,
            'kind': item.kind,
            'title': item.title,
            'body': item.body,
            'route': item.route,
            'data': item.data,
            'created_at': item.created_at,
            'read_at': item.read_at,
        } for item in notifications[:100]],
    })


@api_view(['GET', 'POST'])
def customer_chat_messages(request):
    actor, error = _chat_actor(request)
    if error:
        return error
    conversation, _ = ChatConversation.objects.get_or_create(customer=actor)
    if request.method == 'POST':
        message, error = _save_chat_message(conversation, actor, request)
        if error:
            return error
        return Response(_message_payload(message, request), status=status.HTTP_201_CREATED)
    # Fetching a thread means incoming admin messages reached and were seen by this customer.
    ChatMessage.objects.filter(conversation=conversation, sender__role='admin').update(delivered_to_customer=True, read_by_customer=True)
    # Once the customer opens this chat, remove its related message alerts from the bell.
    AppNotification.objects.filter(recipient=actor, kind=AppNotification.CHAT, data__conversation_id=conversation.pk).delete()
    messages = conversation.messages.select_related('sender').all()
    return Response([_message_payload(message, request) for message in messages])


@api_view(['GET'])
def admin_chat_conversations(request):
    actor, error = _chat_actor(request, require_admin=True)
    if error:
        return error
    # Make every customer available to admin chat, including customers who have not messaged yet.
    for customer in Users.objects.filter(role='user').only('pk').iterator():
        ChatConversation.objects.get_or_create(customer_id=customer.pk)
    conversations = ChatConversation.objects.select_related('customer').prefetch_related('messages__sender').order_by('-updated_at', 'customer__name')
    # The dashboard inbox fetch counts as delivered; opening the thread marks messages seen.
    ChatMessage.objects.filter(conversation__in=conversations, sender__role='user', delivered_to_admin=False).update(delivered_to_admin=True)
    rows = []
    for conversation in conversations:
        latest = conversation.messages.select_related('sender').order_by('-created_at', '-pk').first()
        unread = conversation.messages.filter(sender__role='user', read_by_admin=False).count()
        rows.append({
            'id': conversation.pk,
            'customer': {'id': conversation.customer_id, 'name': conversation.customer.name, 'email': conversation.customer.email, 'mobile_number': conversation.customer.mobile_number},
            'last_message': _message_payload(latest, request) if latest else None,
            'unread_count': unread,
            'updated_at': conversation.updated_at,
        })
    return Response(rows)


@api_view(['GET', 'POST'])
def admin_chat_messages(request, pk):
    actor, error = _chat_actor(request, require_admin=True)
    if error:
        return error
    conversation = get_object_or_404(ChatConversation.objects.select_related('customer'), pk=pk)
    if request.method == 'POST':
        message, error = _save_chat_message(conversation, actor, request)
        if error:
            return error
        return Response(_message_payload(message, request), status=status.HTTP_201_CREATED)
    # Opening the conversation confirms both delivery and that the admin has seen incoming messages.
    ChatMessage.objects.filter(conversation=conversation, sender__role='user').update(delivered_to_admin=True, read_by_admin=True)
    # Opening this admin conversation clears its related message alerts.
    AppNotification.objects.filter(recipient=actor, kind=AppNotification.CHAT, data__conversation_id=conversation.pk).delete()
    messages = conversation.messages.select_related('sender').all()
    return Response([_message_payload(message, request) for message in messages])


def _chat_typing_response(conversation, actor, request):
    if request.method == 'POST':
        is_typing = request.data.get('is_typing')
        if not isinstance(is_typing, bool):
            return Response({'is_typing': ['Send true or false.']}, status=status.HTTP_400_BAD_REQUEST)
        ChatTypingStatus.objects.update_or_create(
            conversation=conversation,
            user=actor,
            defaults={'is_typing': is_typing},
        )
        return Response({'is_typing': is_typing})

    # Typing presence expires automatically if the sender closes the app or loses connection.
    active_since = timezone.now() - timedelta(seconds=5)
    peer_role = 'admin' if actor.role == 'user' else 'user'
    peer_typing = ChatTypingStatus.objects.filter(
        conversation=conversation,
        user__role=peer_role,
        is_typing=True,
        updated_at__gte=active_since,
    ).exists()
    return Response({'is_typing': peer_typing})


@api_view(['GET', 'POST'])
def customer_chat_typing(request):
    actor, error = _chat_actor(request)
    if error:
        return error
    conversation, _ = ChatConversation.objects.get_or_create(customer=actor)
    return _chat_typing_response(conversation, actor, request)


@api_view(['GET', 'POST'])
def admin_chat_typing(request, pk):
    actor, error = _chat_actor(request, require_admin=True)
    if error:
        return error
    conversation = get_object_or_404(ChatConversation, pk=pk)
    return _chat_typing_response(conversation, actor, request)
