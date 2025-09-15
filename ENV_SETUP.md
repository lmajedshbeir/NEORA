# Environment Configuration Setup

This project now uses environment variables for configuration instead of hardcoded values. This makes the application more secure and flexible for different environments.

## 📁 Files Created

- `backend/.env` - Your local environment configuration (DO NOT COMMIT)
- `backend/.env.example` - Template for environment variables (COMMIT THIS)
- `.gitignore` - Excludes .env files from version control

## 🔧 Environment Variables

### Database Configuration
```env
# For SQLite (default development)
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=db.sqlite3

# For PostgreSQL (production)
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=neora_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### N8N Webhook Configuration
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
N8N_BASIC_AUTH=username:password
N8N_API_KEY_HEADER=Authorization
N8N_API_KEY_VALUE=Bearer your-token
```

### Django Configuration
```env
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
```

### Other Configuration
```env
# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_ACCESS_TTL=10
JWT_REFRESH_TTL=1209600

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:5173

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_PORT=587
EMAIL_USE_TLS=true
DEFAULT_FROM_EMAIL=noreply@neora.com

# Frontend
FRONTEND_BASE_URL=http://localhost:5173

# Language and Timezone
LANGUAGE_CODE=en
TIMEZONE=Asia/Riyadh

# Transcription
ENABLE_TRANSCRIPTION=false
```

## 🚀 Setup Instructions

### 1. Copy Environment Template
```bash
cd backend
cp .env.example .env
```

### 2. Edit Your Configuration
Open `backend/.env` and update the values according to your setup:

- **N8N_WEBHOOK_URL**: Your N8N webhook URL
- **DATABASE_ENGINE**: Choose between SQLite (development) or PostgreSQL (production)
- **DJANGO_SECRET_KEY**: Generate a secure secret key for production

### 3. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Test Configuration
```bash
python manage.py check
```

## 🔒 Security Notes

- ✅ `.env` files are excluded from version control
- ✅ `.env.example` provides a template without sensitive data
- ✅ Environment variables are loaded automatically by Django
- ✅ Default values are provided for development

## 🌍 Environment-Specific Setup

### Development
- Use SQLite database
- Set `DJANGO_DEBUG=True`
- Use console email backend

### Production
- Use PostgreSQL database
- Set `DJANGO_DEBUG=False`
- Configure proper email backend
- Use secure secret key
- Set proper allowed hosts

## 📝 Migration from Hardcoded Values

The following settings are now configurable via environment variables:

- ✅ **N8N Webhook URL** - No longer hardcoded
- ✅ **Database Configuration** - Supports both SQLite and PostgreSQL
- ✅ **Authentication Settings** - N8N auth tokens configurable
- ✅ **CORS Settings** - Frontend URLs configurable
- ✅ **Email Settings** - SMTP configuration via env vars

## 🔧 Troubleshooting

### Environment Variables Not Loading
1. Ensure `python-dotenv` is installed: `pip install python-dotenv`
2. Check that `.env` file exists in `backend/` directory
3. Verify file format (no spaces around `=`)

### Database Connection Issues
1. Check `DATABASE_ENGINE` setting
2. For PostgreSQL, ensure all connection parameters are set
3. For SQLite, ensure `DATABASE_NAME` is correct

### N8N Webhook Issues
1. Verify `N8N_WEBHOOK_URL` is correct
2. Check authentication settings if required
3. Test webhook URL manually

## 📚 Additional Resources

- [Django Environment Variables](https://docs.djangoproject.com/en/stable/topics/settings/#environment-variables)
- [python-dotenv Documentation](https://python-dotenv.readthedocs.io/)
- [12-Factor App Methodology](https://12factor.net/config)
