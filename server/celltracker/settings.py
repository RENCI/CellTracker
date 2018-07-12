"""
Django settings for celltracker project.

Generated by 'django-admin startproject' using Django 1.11.13.

For more information on this file, see
https://docs.djangoproject.com/en/1.11/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.11/ref/settings/
"""

import os

# Full filesystem path to the project.
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
local_settings_module = os.environ.get('LOCAL_SETTINGS', 'celltracker.local_settings')

# Name of the directory for the project.
PROJECT_DIRNAME = BASE_DIR.split(os.sep)[-1]

# Every cache key will get prefixed with this value - here we set it to
# the name of the directory the project is in to try and use something
# project specific.
CACHE_MIDDLEWARE_KEY_PREFIX = PROJECT_DIRNAME

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Whether a user's session cookie expires when the Web browser is closed.
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    "django.contrib.redirects",
    'django.contrib.sessions',
    "django.contrib.sites",
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    'django_irods',
    'ct_core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'celltracker.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

for i in range(0, len(TEMPLATES) - 1):
    TEMPLATES[i]['OPTIONS']['debug'] = DEBUG

WSGI_APPLICATION = 'celltracker.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.11/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.',
        'NAME': "",
    }
}


# Password validation
# https://docs.djangoproject.com/en/1.11/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

##################
# LOCAL SETTINGS #
##################

# Allow any settings to be defined in local_settings.py which should be
# ignored in your version control system allowing for settings to be
# defined per machine.
local_settings = __import__(local_settings_module, globals(), locals(), ['*'])
for k in dir(local_settings):
    locals()[k] = getattr(local_settings, k)


# Internationalization
# https://docs.djangoproject.com/en/1.11/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.11/howto/static-files/

STATIC_URL = '/static/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = os.path.join(BASE_DIR, STATIC_URL.strip("/"))

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = STATIC_URL + "media/"

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, *MEDIA_URL.strip("/").split("/"))

# Package/module name to import the root urlpatterns from for the project.
ROOT_URLCONF = "%s.urls" % PROJECT_DIRNAME

CRISPY_TEMPLATE_PACK = 'bootstrap'

VIDEO_FRAME_INTERVAL_SECOND = 1

####################
# LOGGING SETTINGS #
####################
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format' : "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s",
            'datefmt' : "%d/%b/%Y %H:%M:%S"
        },
        'simple': {
            'format': '[%(asctime)s] %(levelname)s %(message)s',
            'datefmt' : "%d/%b/%Y %H:%M:%S"
        },
    },
    'handlers': {
        'syslog': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/home/docker/celltracker/log/system.log',
            'formatter': 'simple',
            'maxBytes': 1024*1024*15, # 15MB
            'backupCount': 10,
        },
        'djangolog': {
            'level': 'DEBUG',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/home/docker/celltracker/log/django.log',
            'formatter': 'verbose',
            'maxBytes': 1024*1024*15, # 15MB
            'backupCount': 10,
        },
        'celltrackerlog': {
            'level': 'DEBUG',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/home/docker/celltracker/log/celltracker.log',
            'formatter': 'verbose',
            'maxBytes': 1024*1024*15, # 15MB
            'backupCount': 10,
        },
    },
    'loggers': {
        'django': {
            'handlers': ['syslog', 'djangolog'],
            'propagate': True,
            'level': 'DEBUG',
        },
        'django.db.backends': {
            'handlers': ['syslog'],
            'level': 'WARNING',
            'propagate': False,
        },
        # Catch-all logger for CellTracker  apps
        '': {
            'handlers': ['celltrackerlog'],
            'propagate': False,
            'level': 'DEBUG'
        },
    }
}

# info django that a reverse proxy sever (nginx) is handling ssl/https for it
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
