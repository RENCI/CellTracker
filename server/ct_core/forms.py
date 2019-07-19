from django import forms
from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordResetForm
from django.utils.translation import ugettext_lazy as _
from django.core.exceptions import ObjectDoesNotExist

from ct_core.models import UserProfile


class SignUpForm(forms.ModelForm):
    """
    A form that creates a user, with no privileges, from the given first_name and last_name and
    password.
    """
    error_messages = {
        'password_mismatch': _("The two password fields didn't match."),
        'email_invalid': _("The input email is not valid."),
    }
    password1 = forms.CharField(
        label=_("Password"),
        strip=False,
        widget=forms.PasswordInput,
        help_text=password_validation.password_validators_help_text_html(),
    )
    password2 = forms.CharField(
        label=_("Password confirmation"),
        widget=forms.PasswordInput,
        strip=False,
        help_text=_("Enter the same password as before, for verification."),
    )
    first_name = forms.CharField(max_length=30, required=True)
    last_name = forms.CharField(max_length=30, required=True)
    grade = forms.IntegerField(max_value=12, min_value=1, required=False,
                               help_text='Optional. Input your grade between 1 to 12.')
    school = forms.CharField(max_length=100, required=False, help_text='Optional. Input the '
                                                                      'name of your school')
    email = forms.EmailField(required=False,
                             help_text='Optional. Input your email for password '
                                                       'reset and notifications')
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'grade', 'school', 'email', 'password1',
                  'password2', )

    def __init__(self, *args, **kwargs):
        super(SignUpForm, self).__init__(*args, **kwargs)
        self.fields['first_name'].widget.attrs.update({'autofocus': True})

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError(
                self.error_messages['password_mismatch'],
                code='password_mismatch',
            )
        password_validation.validate_password(self.cleaned_data.get('password2'), self.instance)
        return password2

    def save(self, commit=True):
        user = super(SignUpForm, self).save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        email = self.cleaned_data['email']
        if email:
            user.email = email
        if commit:
            user.save()
        return user


# form for user profile update
class UserProfileForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super(UserProfileForm, self).__init__(*args, **kwargs)

    class Meta:
        model = User
        fields = ['first_name', 'last_name']

    def save(self, commit=True):
        up = super(UserProfileForm, self).save(commit=commit)
        return up


class UserPasswordResetForm(PasswordResetForm):
    def get_users(self, email):
        """
        Override its parent form's method since we store email in UserProfile not in user
        :return:
        """
        try:
            u = UserProfile.objects.get(email=email)
        except ObjectDoesNotExist:
            return []

        return [u.user]

    def clean_email(self):
        try:
            email = self.cleaned_data.get("email")
            UserProfile.objects.get(email=email)
        except ObjectDoesNotExist:
            raise forms.ValidationError(
                'No user account is associated with the input email',
                code='invalid',
            )
        return email
