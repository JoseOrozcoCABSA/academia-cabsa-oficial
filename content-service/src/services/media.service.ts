import { randomUUID } from 'node:crypto';
import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
import { Op } from 'sequelize';
import env from '#config/env';
import CabsaMediaAssets from '#models/CabsaMediaAssets';
import CabsaMediaRelations from '#models/CabsaMediaRelations';
import { AppError } from '#utils/errors';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/mpeg']);
const documentTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);
const variants = [
  ['small', 320],
  ['medium', 640],
  ['large', 1280],
] as const;

type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';
type RelationType = 'COURSE' | 'LESSON' | 'CAPSULE' | 'MATERIAL';
type UsageType = 'COVER' | 'INLINE' | 'ATTACHMENT';

const storageRoot = path.resolve(process.cwd(), env.mediaStoragePath);
const insideStorage = (target: string): boolean => {
  const relative = path.relative(storageRoot, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const mediaTypeFor = (mime: string): MediaType => {
  if (imageTypes.has(mime)) return 'IMAGE';
  if (videoTypes.has(mime)) return 'VIDEO';
  if (documentTypes.has(mime)) return 'DOCUMENT';
  throw new AppError('Formato de archivo no permitido', 415, 'UNSUPPORTED_MEDIA_TYPE');
};

const extensionFor = (mime: string, detectedExtension?: string): string => {
  if (detectedExtension) return detectedExtension.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const fallbacks: Record<string, string> = {
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.ms-powerpoint': 'ppt',
  };
  return fallbacks[mime] || 'bin';
};

const publicUrls = (asset: Record<string, any>, baseUrl: string) => {
  const prefix = `${baseUrl}/api/content/media/files/${asset.id}`;
  if (asset.type !== 'IMAGE') return { original: `${prefix}/original` };
  return {
    original: `${prefix}/original`,
    small: `${prefix}/small`,
    medium: `${prefix}/medium`,
    large: `${prefix}/large`,
  };
};

const serialized = (asset: CabsaMediaAssets, baseUrl: string) => {
  const value = asset.toJSON() as Record<string, any>;
  return { ...value, urls: publicUrls(value, baseUrl) };
};

const storedFileExists = async (objectKey: unknown): Promise<boolean> => {
  if (typeof objectKey !== 'string' || !objectKey.trim()) return false;
  const target = path.resolve(storageRoot, objectKey);
  if (!insideStorage(target)) return false;
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

class MediaService {
  async list(query: Record<string, unknown>, baseUrl: string) {
    const type = String(query.type || '').toUpperCase();
    const status = String(query.status || 'ACTIVE').toUpperCase();
    const search = String(query.search || '').trim();
    const limit = Math.min(Math.max(Number(query.limit || 50), 1), 100);
    const offset = Math.max(Number(query.offset || 0), 0);
    const where: Record<string | symbol, unknown> = {};
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(type)) where.type = type;
    if (['ACTIVE', 'ARCHIVED'].includes(status)) where.status = status;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { original_name: { [Op.like]: `%${search}%` } },
        { alt_text: { [Op.like]: `%${search}%` } },
      ];
    }
    const result = await CabsaMediaAssets.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });
    // Una restauración de base sin el volumen multimedia puede dejar registros
    // huérfanos. No se ofrecen en el selector porque sus miniaturas terminarían
    // inevitablemente en 404; el registro permanece intacto para auditoría.
    const availableRows = (await Promise.all(result.rows.map(async (asset) => {
      const value = asset.toJSON() as Record<string, any>;
      return await storedFileExists(value.object_key) ? serialized(asset, baseUrl) : null;
    }))).filter((asset): asset is NonNullable<typeof asset> => asset !== null);
    return {
      items: availableRows,
      total: result.count,
      limit,
      offset,
    };
  }

  async find(id: string, baseUrl: string) {
    const asset = await CabsaMediaAssets.findByPk(id);
    if (!asset) throw new AppError('Archivo multimedia no encontrado', 404, 'MEDIA_NOT_FOUND');
    const relations = await CabsaMediaRelations.findAll({ where: { asset_id: id }, order: [['sort_order', 'ASC']] });
    return {
      ...serialized(asset, baseUrl),
      relations: relations.map((relation) => relation.toJSON()),
    };
  }

  async upload(file: Express.Multer.File | undefined, data: Record<string, unknown>, userId: string | null, baseUrl: string) {
    if (!file) throw new AppError('Selecciona un archivo', 400, 'FILE_REQUIRED');
    if (!file.path) throw new AppError('No fue posible preparar el archivo', 500, 'UPLOAD_TEMPORARY_FILE_MISSING');
    const detected = await fileTypeFromFile(file.path);
    if (!detected && /^(image|video)\//i.test(file.mimetype)) {
      throw new AppError('No fue posible verificar el tipo real del archivo', 415, 'UNVERIFIED_MEDIA_TYPE');
    }
    const officeMime = /officedocument|msword|ms-excel|ms-powerpoint/i.test(file.mimetype);
    const mime = detected?.mime === 'application/zip' && officeMime
      ? file.mimetype
      : detected?.mime || file.mimetype;
    const type = mediaTypeFor(mime);
    const altText = String(data.alt_text || '').trim().slice(0, 500);
    if (type === 'IMAGE' && !altText) {
      throw new AppError('El texto alternativo es obligatorio para imágenes', 400, 'ALT_TEXT_REQUIRED');
    }
    const id = randomUUID();
    const directoryName = type.toLowerCase();
    const assetDirectory = path.resolve(storageRoot, directoryName, id);
    if (!insideStorage(assetDirectory)) throw new AppError('Ruta de almacenamiento inválida', 500, 'INVALID_STORAGE_PATH');
    await mkdir(assetDirectory, { recursive: true });

    let objectKey = '';
    let width: number | null = null;
    let height: number | null = null;
    let storedSize = file.size;
    let generatedVariants: Record<string, string> | null = null;

    try {
      if (type === 'IMAGE') {
        const image = sharp(file.path, { animated: false }).rotate();
        const metadata = await image.metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
        objectKey = `${directoryName}/${id}/original.webp`;
        const originalBuffer = await image.webp({ quality: 88, effort: 4 }).toBuffer();
        await writeFile(path.join(assetDirectory, 'original.webp'), originalBuffer);
        storedSize = originalBuffer.length;
        generatedVariants = {};
        for (const [name, variantWidth] of variants) {
          const filename = `${name}.webp`;
          await sharp(file.path).rotate().resize({
            width: variantWidth,
            withoutEnlargement: true,
            fit: 'inside',
          }).webp({ quality: 82, effort: 4 }).toFile(path.join(assetDirectory, filename));
          generatedVariants[name] = `${directoryName}/${id}/${filename}`;
        }
      } else {
        const extension = extensionFor(mime, detected?.ext);
        const filename = `original.${extension}`;
        objectKey = `${directoryName}/${id}/${filename}`;
        await copyFile(file.path, path.join(assetDirectory, filename));
      }

      const now = new Date();
      const asset = await CabsaMediaAssets.create({
        id,
        type,
        title: String(data.title || path.parse(file.originalname).name).trim().slice(0, 255),
        object_key: objectKey,
        original_name: file.originalname.slice(0, 255),
        mime_type: type === 'IMAGE' ? 'image/webp' : mime,
        size_bytes: storedSize,
        width,
        height,
        duration_seconds: data.duration_seconds ? Number(data.duration_seconds) : null,
        alt_text: altText || null,
        status: 'ACTIVE',
        variants: generatedVariants,
        metadata: { sourceMime: mime, sourceSize: file.size },
        created_by: userId,
        created_at: now,
        updated_at: now,
      });
      return serialized(asset, baseUrl);
    } catch (error) {
      await rm(assetDirectory, { recursive: true, force: true });
      if (error instanceof AppError) throw error;
      if (error instanceof Error && /unsupported|invalid|corrupt|Input buffer/i.test(error.message)) {
        throw new AppError('La imagen está dañada o no es compatible', 400, 'INVALID_IMAGE');
      }
      throw error;
    } finally {
      await rm(file.path, { force: true }).catch(() => undefined);
    }
  }

  async update(id: string, data: Record<string, unknown>, baseUrl: string) {
    const asset = await CabsaMediaAssets.findByPk(id);
    if (!asset) throw new AppError('Archivo multimedia no encontrado', 404, 'MEDIA_NOT_FOUND');
    const values: Record<string, unknown> = { updated_at: new Date() };
    if (data.title !== undefined) values.title = String(data.title).trim().slice(0, 255);
    if (data.alt_text !== undefined) values.alt_text = String(data.alt_text).trim().slice(0, 500) || null;
    if (['ACTIVE', 'ARCHIVED'].includes(String(data.status).toUpperCase())) values.status = String(data.status).toUpperCase();
    if (data.duration_seconds !== undefined) values.duration_seconds = data.duration_seconds ? Number(data.duration_seconds) : null;
    await asset.update(values);
    return serialized(asset, baseUrl);
  }

  async file(id: string, variant: string) {
    const asset = await CabsaMediaAssets.findByPk(id);
    if (!asset || asset.get('status') === 'ARCHIVED') {
      throw new AppError('Archivo multimedia no encontrado', 404, 'MEDIA_NOT_FOUND');
    }
    const value = asset.toJSON() as Record<string, any>;
    const allowedVariant = ['original', 'small', 'medium', 'large'].includes(variant) ? variant : 'original';
    let objectKey = allowedVariant === 'original'
      ? value.object_key
      : value.variants?.[allowedVariant];
    if (!objectKey) throw new AppError('Variante de imagen no encontrada', 404, 'VARIANT_NOT_FOUND');
    let target = path.resolve(storageRoot, objectKey);
    if (!insideStorage(target)) throw new AppError('Ruta de archivo inválida', 500, 'INVALID_STORAGE_PATH');
    if (!await storedFileExists(objectKey)) {
      // Las variantes pueden faltar en archivos antiguos. En ese caso se sirve
      // el original antes de declarar rota una imagen que sí está disponible.
      if (allowedVariant !== 'original' && await storedFileExists(value.object_key)) {
        objectKey = value.object_key;
        target = path.resolve(storageRoot, objectKey);
      } else {
        throw new AppError('El archivo multimedia no existe en el almacenamiento', 404, 'MEDIA_FILE_MISSING');
      }
    }
    return {
      filePath: target,
      mimeType: value.type === 'IMAGE' ? 'image/webp' : value.mime_type,
      filename: value.original_name,
      cacheControl: 'public, max-age=31536000, immutable',
    };
  }

  async link(id: string, data: Record<string, unknown>) {
    const asset = await CabsaMediaAssets.findByPk(id);
    if (!asset) throw new AppError('Archivo multimedia no encontrado', 404, 'MEDIA_NOT_FOUND');
    const entityType = String(data.entity_type || '').toUpperCase() as RelationType;
    const usageType = String(data.usage_type || '').toUpperCase() as UsageType;
    const entityId = String(data.entity_id || '').trim();
    if (!['COURSE', 'LESSON', 'CAPSULE', 'MATERIAL'].includes(entityType) || !entityId
      || !['COVER', 'INLINE', 'ATTACHMENT'].includes(usageType)) {
      throw new AppError('Relación multimedia inválida', 400, 'INVALID_MEDIA_RELATION');
    }
    if (usageType === 'COVER') {
      await CabsaMediaRelations.destroy({ where: { entity_type: entityType, entity_id: entityId, usage_type: usageType } });
    }
    const relation = await CabsaMediaRelations.create({
      id: randomUUID(),
      asset_id: id,
      entity_type: entityType,
      entity_id: entityId,
      usage_type: usageType,
      sort_order: Number(data.sort_order || 0),
      created_at: new Date(),
    });
    return relation.toJSON();
  }

  async unlink(relationId: string) {
    const affected = await CabsaMediaRelations.destroy({ where: { id: relationId } });
    if (!affected) throw new AppError('Relación multimedia no encontrada', 404, 'RELATION_NOT_FOUND');
    return { affected };
  }

  async remove(id: string) {
    const asset = await CabsaMediaAssets.findByPk(id);
    if (!asset) throw new AppError('Archivo multimedia no encontrado', 404, 'MEDIA_NOT_FOUND');
    const relations = await CabsaMediaRelations.count({ where: { asset_id: id } });
    if (relations) {
      throw new AppError('El archivo está siendo utilizado y no se puede eliminar', 409, 'MEDIA_IN_USE');
    }
    const value = asset.toJSON() as Record<string, any>;
    const target = path.resolve(storageRoot, path.dirname(value.object_key));
    if (!insideStorage(target)) throw new AppError('Ruta de archivo inválida', 500, 'INVALID_STORAGE_PATH');
    await asset.destroy();
    await rm(target, { recursive: true, force: true });
    return { affected: 1 };
  }
}

export default new MediaService();
