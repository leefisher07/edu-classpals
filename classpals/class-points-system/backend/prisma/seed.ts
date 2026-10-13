import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { petImageSeedData } from './pet-image-seed-data';

const adapter = new PrismaLibSql({
  url: 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

const toUploadImagePath = (image?: string) => {
  if (!image) return '';
  if (image.startsWith('/uploads/')) return image;
  if (image.startsWith('/pets/')) return image.replace('/pets/', '/uploads/pets/');
  return image;
};

async function seedActivationCode() {
  await prisma.activationCode.upsert({
    where: { code: 'TEST2024' },
    update: {
      type: 'TIME_LIMITED',
      days: 365,
      planName: '一年版',
      note: '测试激活码',
    },
    create: {
      code: 'TEST2024',
      type: 'TIME_LIMITED',
      days: 365,
      planName: '一年版',
      note: '测试激活码',
    },
  });
}

async function seedPetGallery() {
  for (let index = 0; index < petImageSeedData.length; index += 1) {
    const pet = petImageSeedData[index];
    const [egg, baby, teen, adult, final] = pet.stages;

    await prisma.petGallery.upsert({
      where: { id: pet.id },
      update: {
        name: pet.name,
        type: pet.category,
        category: pet.category,
        source: 'seed:pet-image-data',
        version: 1,
        isEnabled: true,
        eggImage: toUploadImagePath(egg?.image),
        babyImage: toUploadImagePath(baby?.image ?? egg?.image),
        teenImage: toUploadImagePath(teen?.image ?? baby?.image ?? egg?.image),
        adultImage: toUploadImagePath(adult?.image ?? teen?.image ?? baby?.image ?? egg?.image),
        finalImage: toUploadImagePath(final?.image ?? adult?.image ?? teen?.image ?? baby?.image ?? egg?.image),
        sortOrder: index + 1,
      },
      create: {
        id: pet.id,
        name: pet.name,
        type: pet.category,
        category: pet.category,
        rarity: 'COMMON',
        description: `${pet.category} · ${pet.name}`,
        source: 'seed:pet-image-data',
        version: 1,
        isEnabled: true,
        eggImage: toUploadImagePath(egg?.image),
        babyImage: toUploadImagePath(baby?.image ?? egg?.image),
        teenImage: toUploadImagePath(teen?.image ?? baby?.image ?? egg?.image),
        adultImage: toUploadImagePath(adult?.image ?? teen?.image ?? baby?.image ?? egg?.image),
        finalImage: toUploadImagePath(final?.image ?? adult?.image ?? teen?.image ?? baby?.image ?? egg?.image),
        sortOrder: index + 1,
      },
    });
  }
}

async function main() {
  await seedActivationCode();
  await seedPetGallery();

  const petCount = await prisma.petGallery.count();
  console.log('✅ 测试激活码已就绪');
  console.log(`✅ 宠物图鉴导入完成: ${petCount} 条`);
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
