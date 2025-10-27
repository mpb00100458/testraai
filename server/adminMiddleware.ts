import { Request, Response, NextFunction } from 'express';
import type { User } from '@shared/schema';

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user: User;
}

// Check if user has any admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!authReq.user.systemRole) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}

// Check if user has super admin role
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (authReq.user.systemRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: "Super admin access required" });
  }

  next();
}

// Check if user has billing admin role or higher
export function requireBillingAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const allowedRoles = ['SUPER_ADMIN', 'BILLING_ADMIN'];
  if (!authReq.user.systemRole || !allowedRoles.includes(authReq.user.systemRole)) {
    return res.status(403).json({ message: "Billing admin access required" });
  }

  next();
}

// Check if user has support admin role or higher
export function requireSupportAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const allowedRoles = ['SUPER_ADMIN', 'SUPPORT_ADMIN'];
  if (!authReq.user.systemRole || !allowedRoles.includes(authReq.user.systemRole)) {
    return res.status(403).json({ message: "Support admin access required" });
  }

  next();
}
