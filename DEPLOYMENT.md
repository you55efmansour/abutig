# Municipal Complaints System - Deployment Guide

## 🚀 Production Deployment Checklist

### 1. Environment Setup

#### Required Environment Variables
Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="your-production-database-url"
NODE_ENV="production"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-key"
JWT_ACCESS_TOKEN_EXPIRY="15m"
JWT_REFRESH_TOKEN_EXPIRY="7d"

# Server Configuration
PORT=3001
FRONTEND_URL="https://your-domain.com"
API_URL="https://your-domain.com/api"

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com

# Security Configuration
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./server/uploads

# Admin Configuration
ADMIN_EMAILS=admin1@your-domain.com,admin2@your-domain.com
ADMIN_PASSWORD=SecurePassword123!

# Production Settings
PRODUCTION_URL=https://your-domain.com
SECURE_COOKIES=true
HTTPS_ENABLED=true
```

### 2. Security Checklist

#### ✅ Authentication & Authorization
- [ ] JWT tokens are properly configured with secure secrets
- [ ] Password hashing is enabled (bcrypt with salt rounds 12+)
- [ ] Role-based access control is implemented
- [ ] Session management is secure
- [ ] Token expiration is properly set

#### ✅ Input Validation & Sanitization
- [ ] All user inputs are validated on both frontend and backend
- [ ] SQL injection protection is enabled
- [ ] XSS protection is implemented
- [ ] File upload validation is active
- [ ] Path traversal protection is enabled

#### ✅ Rate Limiting
- [ ] Authentication endpoints are rate limited (5 attempts per 15 minutes)
- [ ] Complaint submission is rate limited (10 per hour)
- [ ] Admin actions are rate limited (50 per 5 minutes)
- [ ] General API rate limiting is active (100 per 15 minutes)

#### ✅ Security Headers
- [ ] Content Security Policy (CSP) is configured
- [ ] X-Frame-Options is set to DENY
- [ ] X-Content-Type-Options is set to nosniff
- [ ] X-XSS-Protection is enabled
- [ ] Strict-Transport-Security is configured for HTTPS
- [ ] Referrer-Policy is set to strict-origin-when-cross-origin

#### ✅ File Upload Security
- [ ] File type validation is active
- [ ] File size limits are enforced (5MB max)
- [ ] File extension validation is enabled
- [ ] Upload directory is secured
- [ ] Malicious file detection is active

#### ✅ Database Security
- [ ] Database connection uses SSL/TLS
- [ ] Connection pooling is configured
- [ ] Query timeouts are set
- [ ] Database credentials are secure
- [ ] Regular backups are scheduled

### 3. Production Deployment Steps

#### Step 1: Server Setup
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx
sudo apt install nginx -y

# Install SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
```

#### Step 2: Application Deployment
```bash
# Clone the repository
git clone https://github.com/your-repo/municipal-complaints-system.git
cd municipal-complaints-system

# Install dependencies
npm install
cd server && npm install && cd ..

# Build the frontend
npm run build

# Set up environment variables
cp env.example .env
# Edit .env with production values

# Set up database
npx prisma migrate deploy
npx prisma generate

# Create uploads directory
mkdir -p server/uploads
chmod 755 server/uploads

# Start the application with PM2
pm2 start server/index.js --name "municipal-complaints"
pm2 save
pm2 startup
```

#### Step 3: Nginx Configuration
Create `/etc/nginx/sites-available/municipal-complaints`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        root /var/www/municipal-complaints/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    }

    # File uploads
    location /uploads/ {
        alias /var/www/municipal-complaints/server/uploads/;
        expires 1y;
        add_header Cache-Control "public";
        
        # Security for uploads
        location ~* \.(php|pl|py|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/api/health;
        access_log off;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/municipal-complaints /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 4: SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

#### Step 5: Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 4. Monitoring & Logging

#### PM2 Monitoring
```bash
# Monitor application
pm2 monit

# View logs
pm2 logs municipal-complaints

# Set up log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

#### Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### 5. Backup Strategy

#### Database Backups
```bash
# Create backup script
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/database"
mkdir -p $BACKUP_DIR

# SQLite backup
cp /var/www/municipal-complaints/prisma/dev.db $BACKUP_DIR/dev_$DATE.db

# Keep only last 7 days
find $BACKUP_DIR -name "dev_*.db" -mtime +7 -delete
EOF

chmod +x /root/backup-db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /root/backup-db.sh" | crontab -
```

#### File Uploads Backup
```bash
# Create uploads backup script
cat > /root/backup-uploads.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/uploads"
mkdir -p $BACKUP_DIR

tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /var/www/municipal-complaints/server uploads/

# Keep only last 30 days
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete
EOF

chmod +x /root/backup-uploads.sh

# Add to crontab (weekly on Sunday at 3 AM)
echo "0 3 * * 0 /root/backup-uploads.sh" | crontab -
```

### 6. Security Monitoring

#### Install Fail2ban
```bash
sudo apt install fail2ban -y

# Configure for nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Add to `/etc/fail2ban/jail.local`:
```ini
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/access.log
```

#### Security Scanning
```bash
# Install security tools
sudo apt install lynis -y

# Run security audit
sudo lynis audit system

# Install ClamAV for malware scanning
sudo apt install clamav clamav-daemon -y
sudo freshclam
```

### 7. Performance Optimization

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_created_at ON complaints(created_at);
CREATE INDEX idx_complaints_complainant_id ON complaints(complainant_id);
CREATE INDEX idx_complaints_assigned_to_id ON complaints(assigned_to_id);
```

#### Application Optimization
```bash
# Enable compression in nginx
sudo nano /etc/nginx/nginx.conf
# Add: gzip on; gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 8. Testing Checklist

#### Security Tests
- [ ] Run `npm run security:scan`
- [ ] Test authentication bypass attempts
- [ ] Test SQL injection attempts
- [ ] Test XSS attempts
- [ ] Test file upload security
- [ ] Test rate limiting
- [ ] Test authorization boundaries

#### Functionality Tests
- [ ] Test complaint submission
- [ ] Test user registration/login
- [ ] Test admin dashboard
- [ ] Test file uploads
- [ ] Test email notifications
- [ ] Test mobile responsiveness

#### Performance Tests
- [ ] Load testing with multiple users
- [ ] Database performance under load
- [ ] File upload performance
- [ ] API response times

### 9. Maintenance

#### Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
npm audit fix
npm update

# Update PM2
pm2 update
```

#### Health Checks
```bash
# Check application status
pm2 status

# Check nginx status
sudo systemctl status nginx

# Check disk space
df -h

# Check memory usage
free -h
```

### 10. Emergency Procedures

#### Application Restart
```bash
pm2 restart municipal-complaints
```

#### Database Recovery
```bash
# Restore from backup
cp /var/backups/database/dev_YYYYMMDD_HHMMSS.db /var/www/municipal-complaints/prisma/dev.db
```

#### Rollback Deployment
```bash
# Revert to previous version
git checkout HEAD~1
npm install
npm run build
pm2 restart municipal-complaints
```

## 🔒 Security Best Practices

1. **Never commit sensitive data** to version control
2. **Use strong passwords** and rotate them regularly
3. **Keep all software updated** to latest versions
4. **Monitor logs** for suspicious activity
5. **Regular security audits** and penetration testing
6. **Backup data** regularly and test restores
7. **Use HTTPS** for all communications
8. **Implement proper access controls**
9. **Monitor system resources** and performance
10. **Have incident response plan** ready

## 📞 Support

For deployment issues or security concerns:
- Check application logs: `pm2 logs municipal-complaints`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Monitor system resources: `htop` or `top`
- Review security headers: Use browser developer tools
