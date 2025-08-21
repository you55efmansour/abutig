// Admin configuration system
// This file manages admin user access through environment variables and configuration

const getAdminConfig = () => {
  // Read admin identifiers from environment variables (case-insensitive)
  const adminEmails = process.env.ADMIN_EMAILS ? 
    process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) : [];
  
  const adminUserIds = process.env.ADMIN_USER_IDS ? 
    process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()) : [];
  
  const adminPhones = process.env.ADMIN_PHONES ? 
    process.env.ADMIN_PHONES.split(',').map(phone => phone.trim()) : [];
  
  const adminNationalIds = process.env.ADMIN_NATIONAL_IDS ? 
    process.env.ADMIN_NATIONAL_IDS.split(',').map(nid => nid.trim()) : [];

  return {
    adminEmails,
    adminUserIds,
    adminPhones,
    adminNationalIds,
    // Default admin emails if no environment variables are set
    defaultAdminEmails: [
      'emanhassanmahmoud1@gmail.com',
      'karemelolary8@gmail.com'
    ]
  };
};

const isAdminUser = (user) => {
  if (!user) return false;
  
  const config = getAdminConfig();
  
  // Check if user has ADMIN role
  if (user.role === 'ADMIN') return true;
  
  // Check against configured admin identifiers
  if (user.email && config.adminEmails.includes(user.email.toLowerCase())) return true;
  if (user.id && config.adminUserIds.includes(user.id)) return true;
  if (user.phone && config.adminPhones.includes(user.phone)) return true;
  if (user.nationalId && config.adminNationalIds.includes(user.nationalId)) return true;
  
  // Fallback to default admin emails if no environment variables are set
  if (config.adminEmails.length === 0 && user.email) {
    return config.defaultAdminEmails.includes(user.email.toLowerCase());
  }
  
  return false;
};

const getAdminIdentifiers = () => {
  const config = getAdminConfig();
  return {
    emails: config.adminEmails.length > 0 ? config.adminEmails : config.defaultAdminEmails,
    userIds: config.adminUserIds,
    phones: config.adminPhones,
    nationalIds: config.adminNationalIds
  };
};

module.exports = {
  getAdminConfig,
  isAdminUser,
  getAdminIdentifiers
};
