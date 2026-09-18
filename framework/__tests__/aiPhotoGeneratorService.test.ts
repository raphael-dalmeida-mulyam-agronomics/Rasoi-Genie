import { generateDishPhotoWithAI } from '../../features/admin/aiPhotoGeneratorService';

describe('aiPhotoGeneratorService', () => {
  it('generates an AI photo for biryani dishes', async () => {
    const result = await generateDishPhotoWithAI({
      dishName: 'Hyderabadi Mutton Dum Biryani',
      cuisine: 'Hyderabadi',
      presentationStyle: 'handi',
    });

    expect(result).toBeDefined();
    expect(result.imageUrl).toContain('http');
    expect(result.presentationStyle).toBeDefined();
    expect(result.promptUsed).toContain('Hyderabadi Mutton Dum Biryani');
  });

  it('generates an AI photo for paneer dishes', async () => {
    const result = await generateDishPhotoWithAI({
      dishName: 'Royal Shahi Paneer',
      cuisine: 'North Indian',
      diet: 'veg',
      presentationStyle: 'finedining',
    });

    expect(result).toBeDefined();
    expect(result.imageUrl).toContain('http');
    expect(result.promptUsed).toContain('fine-dining');
  });

  it('provides safe fallback for unknown dish names', async () => {
    const result = await generateDishPhotoWithAI({
      dishName: 'Grandma Secret Recipe',
      diet: 'nonveg',
    });

    expect(result.imageUrl).toBeDefined();
    expect(result.promptUsed).toContain('Grandma Secret Recipe');
  });
});
