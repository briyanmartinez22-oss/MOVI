/**
 * Mock API routes — preparado para migrar a backend real.
 * Implementación actual: src/services/mockApi/index.ts
 */
export const MOCK_API_ROUTES = {
  auth: {
    requestOtp: 'POST /auth/request-otp',
    verifyOtp: 'POST /auth/verify-otp',
  },
  owners: {
    register: 'POST /owners/register',
    uploadDocuments: 'POST /owners/upload-documents',
    submitVerification: 'POST /owners/submit-verification',
  },
  vehicles: {
    register: 'POST /vehicles/register',
    uploadDocuments: 'POST /vehicles/upload-documents',
    submitVerification: 'POST /vehicles/submit-verification',
    checkPlate: 'GET /vehicles/check-plate/:plate',
    inviteDriver: 'POST /vehicles/:vehicleId/invite-driver',
  },
  drivers: {
    registerWithInvite: 'POST /drivers/register-with-invite',
    startSession: 'POST /drivers/:driverId/sessions/start',
    endSession: 'POST /drivers/:driverId/sessions/end',
  },
  admin: {
    approveOwner: 'POST /admin/owners/:ownerId/approve',
    rejectOwner: 'POST /admin/owners/:ownerId/reject',
    approveVehicle: 'POST /admin/vehicles/:vehicleId/approve',
    rejectVehicle: 'POST /admin/vehicles/:vehicleId/reject',
    approveDriver: 'POST /admin/drivers/:driverId/approve',
    rejectDriver: 'POST /admin/drivers/:driverId/reject',
  },
} as const;
