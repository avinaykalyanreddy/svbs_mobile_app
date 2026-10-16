from rest_framework import serializers
from decimal import Decimal, InvalidOperation
from django.utils import timezone

from .models import Ads, BankAndPercentage, BankNames, Percentage, QRPercentage

class BankNamesSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=50)
    class Meta:
        model = BankNames
        fields = '__all__'

    def validate_name(self, value):
        name = value.strip().title()
        matches = BankNames.objects.filter(name__iexact=name)
        if self.instance is not None:
            matches = matches.exclude(pk=self.instance.pk)
        if matches.exists():
            raise serializers.ValidationError('A bank with this name already exists.')
        return name


class QRPercentageSerializer(serializers.ModelSerializer):
    class Meta:
        model = QRPercentage
        fields = ['id', 'name', 'source', 'percentage', 'imps', 'msg', 'created']
        read_only_fields = ['id', 'created']

    def validate_imps(self, value):
        if value < 0:
            raise serializers.ValidationError('IMPS charge cannot be negative.')
        return value

class AdsSerializer(serializers.ModelSerializer):
    is_new = serializers.SerializerMethodField()

    class Meta:
        model = Ads
        fields = ['id', 'title', 'descript', 'created', 'is_new']
        read_only_fields = ['id', 'created', 'is_new']

    def get_is_new(self, ad):
        age_seconds = (timezone.now() - ad.created).total_seconds()
        return 0 <= age_seconds < 24 * 60 * 60


class PercentageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Percentage
        fields = ['percentage', 'msg', 'imps', 'created']
        read_only_fields = ['created']

    def validate_percentage(self, value):
        try:
            number = Decimal(value)
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError('Enter a whole number or decimal percentage.')
        if not number.is_finite() or number < 0 or number > 100:
            raise serializers.ValidationError('Percentage must be between 0 and 100.')
        # Normalize equivalent values so 2.50 and 2.5 cannot create separate groups.
        normalized = format(number.normalize(), 'f')
        if len(normalized) > 10:
            raise serializers.ValidationError('Percentage must be 10 characters or fewer.')
        return normalized

    def validate_imps(self, value):
        if value < 0:
            raise serializers.ValidationError('IMPS charge cannot be negative.')
        return value


class BankAndPercentageSerializer(serializers.ModelSerializer):
    bank_name = serializers.CharField(source='bank.name', read_only=True)

    class Meta:
        model = BankAndPercentage
        fields = ['id', 'bank_name', 'percentage', 'created']
        read_only_fields = ['id', 'created']
