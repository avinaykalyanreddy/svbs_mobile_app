from django.db import models
from django.core.validators import RegexValidator

# Create your models here.
class BankNames(models.Model):

    name = models.CharField(max_length=50, primary_key=True,unique=True)

    def __str__(self):

        return self.name


class QRPercentage(models.Model):
    name = models.CharField(max_length=100, blank=True, default='')
    source = models.URLField(max_length=500)
    percentage = models.FloatField()
    imps = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    msg = models.TextField(blank=True, default='')
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source} - {self.percentage}%"

class Ads(models.Model):

    title = models.CharField(max_length=100)
    descript = models.TextField()
    created = models.DateTimeField(auto_now_add=True)

class Percentage(models.Model):
    percentage = models.CharField(
        max_length=10,
        primary_key=True,
        validators=[RegexValidator(r'^\d+(?:\.\d+)?$', 'Enter a whole number or decimal percentage.')],
    )


    msg = models.TextField(blank=True, default='')
    imps = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.percentage}%'


class BankAndPercentage(models.Model):
    bank = models.ForeignKey(
        BankNames,
        db_column='bank_id',
        on_delete=models.CASCADE,
        related_name='percentage_assignments',
    )
    percentage = models.ForeignKey(
        Percentage,
        on_delete=models.CASCADE,
        related_name='bank_assignments',
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['bank', 'percentage'], name='unique_bank_percentage_assignment'),
        ]

    def __str__(self):
        return f'{self.bank.name} - {self.percentage.percentage}%'


class ChatConversation(models.Model):
    # Each customer gets one private support conversation shared with admins.
    customer = models.OneToOneField('user.Users', on_delete=models.CASCADE, related_name='support_conversation')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Support chat with {self.customer.name}'


class ChatMessage(models.Model):
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('user.Users', on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField(blank=True, default='')
    image = models.FileField(upload_to='chat_photos/', blank=True, null=True)
    left_face_image = models.FileField(upload_to='chat_verification/', blank=True, null=True)
    right_face_image = models.FileField(upload_to='chat_verification/', blank=True, null=True)
    read_by_customer = models.BooleanField(default=False)
    read_by_admin = models.BooleanField(default=False)
    # Delivery is recorded when the recipient's app fetches the conversation.
    delivered_to_customer = models.BooleanField(default=False)
    delivered_to_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    def __str__(self):
        return f'Message {self.pk} in conversation {self.conversation_id}'


class ChatTypingStatus(models.Model):
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name='typing_statuses')
    user = models.ForeignKey('user.Users', on_delete=models.CASCADE, related_name='chat_typing_statuses')
    is_typing = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['conversation', 'user'], name='unique_chat_typing_status_per_user'),
        ]


class AppNotification(models.Model):
    ANNOUNCEMENT = 'announcement'
    CHAT = 'chat'
    KIND_CHOICES = [(ANNOUNCEMENT, 'Announcement'), (CHAT, 'Chat message')]

    recipient = models.ForeignKey('user.Users', on_delete=models.CASCADE, related_name='notifications')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True, default='')
    route = models.CharField(max_length=160, default='/notifications')
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at', '-id']
