/**
 * TypeScript entry + native fallback. Metro resolves uploadService.web.ts on web
 * and uploadService.native.ts on iOS/Android.
 */
export type { NativeFormFile, UploadAsset } from './uploadService.shared';
export { uploadFile, uploadPickedAsset, pickAndUploadDocument } from './uploadService.native';
