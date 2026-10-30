/**
 * Storage provider facade. Keep upload APIs importing from this module;
 * when object storage is introduced later, switch the implementation here.
 */
export {
  deleteStoredMediaFile,
  getMediaDirectory,
  getMediaFilePath,
  getMediaRoot,
  getStoredMediaAbsolutePath,
  saveMediaFile,
  toMediaUrl,
} from "./local-storage";
