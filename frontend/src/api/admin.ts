import { apiClient } from './client'
import { Role } from '../context/AuthContext'

export interface UserSummary {
  id: string
  fullName: string
  email: string
  role: Role
}

export const getPendingUsers = async (): Promise<UserSummary[]> => {
  const { data } = await apiClient.get('/api/admin/users?status=pending')
  return data
}

export const updateUserStatus = async (userId: string, action: 'APPROVE' | 'REJECT'): Promise<void> => {
  await apiClient.patch(`/api/admin/users/${userId}/status`, { action })
}

export const updateUserRole = async (userId: string, role: Role): Promise<void> => {
  await apiClient.patch(`/api/admin/users/${userId}/role`, { role })
}

export const resetUserMfa = async (userId: string): Promise<void> => {
  await apiClient.patch(`/api/admin/users/${userId}/mfa-reset`)
}
