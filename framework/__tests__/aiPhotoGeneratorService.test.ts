import {
  generateDishPhotoWithAI,
  generateStepPhotoWithAI,
} from '../../features/admin/aiPhotoGeneratorService';

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

  describe('generateStepPhotoWithAI', () => {
    it('generates step photo and synthesizes ingredients and prior instructions into the prompt', async () => {
      const result = await generateStepPhotoWithAI({
        dishName: 'Paneer Butter Masala',
        cuisine: 'North Indian',
        diet: 'veg',
        stepNumber: 2,
        stepTitle: 'Simmer Cashew Tomato Gravy',
        stepInstruction:
          'Empty Sachet 2 and stir the velvety gravy with 100ml warm water for 4 minutes.',
        allIngredients: [
          { name: 'Fresh Malai Paneer', quantity: '250g', isMasalaSachet: false },
          { name: 'Sachet 1: Whole Khada Spices', quantity: '15g', isMasalaSachet: true },
          { name: 'Sachet 2: Chef Gravy Premix', quantity: '80g', isMasalaSachet: true },
        ],
        previousSteps: [
          {
            stepNumber: 1,
            title: 'Temper Whole Spices',
            instruction: 'Heat ghee and sizzle Sachet 1 whole spices for 45s.',
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.imageUrl).toContain('http');
      expect(result.presentationStyle).toBeDefined();
      // Verifies the prompt explicitly reads ingredients and previous steps
      expect(result.promptUsed).toContain('Paneer Butter Masala');
      expect(result.promptUsed).toContain('Fresh Malai Paneer');
      expect(result.promptUsed).toContain('Sachet 2: Chef Gravy Premix');
      expect(result.promptUsed).toContain('Temper Whole Spices');
      expect(result.promptUsed).toContain('Step 2');
    });

    it('identifies tempering preparation stage for Step 1', async () => {
      const result = await generateStepPhotoWithAI({
        dishName: 'Dal Tadka',
        stepNumber: 1,
        stepTitle: 'Temper Spices in Ghee',
        stepInstruction: 'Heat 2 tbsp desi ghee, crackle cumin seeds and whole red chillies.',
      });

      expect(result.imageUrl).toBeDefined();
      expect(result.presentationStyle).toContain('Tempering & Tadka');
    });

    it('identifies protein / paneer stage when folding in paneer cubes', async () => {
      const result = await generateStepPhotoWithAI({
        dishName: 'Kadai Paneer',
        stepNumber: 3,
        stepTitle: 'Add Paneer & Simmer',
        stepInstruction: 'Fold in the diced fresh paneer cubes and simmer gently for 3 mins.',
      });

      expect(result.imageUrl).toBeDefined();
      expect(result.presentationStyle).toContain('Paneer');
    });

    it('handles minimal input with robust fallback', async () => {
      const result = await generateStepPhotoWithAI({
        dishName: '',
        stepNumber: 1,
        stepTitle: '',
        stepInstruction: '',
      });

      expect(result.imageUrl).toBeDefined();
      expect(result.promptUsed).toBeDefined();
      expect(result.presentationStyle).toBeDefined();
    });
  });
});
