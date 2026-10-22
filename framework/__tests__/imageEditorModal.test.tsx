import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../theme/ThemeContext';
import { ImageEditorModal } from '../ui/ImageEditorModal';
import { Step1Details } from '../../features/chef/components/Step1Details';
import { Step3CookingSteps } from '../../features/chef/components/Step3CookingSteps';
import { ChefRecipeFormState, StructuredStep } from '../../features/chef/types';

async function renderWithTheme(ui: React.ReactElement) {
  return await render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ImageEditorModal Component & Chef Image Upload Integration', () => {
  const sampleImageUri =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  describe('1. ImageEditorModal Functionality', () => {
    it('renders correctly when visible with imageUri', async () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByTestId, getByText } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          title="Edit Recipe Cover Photo"
          defaultAspectRatio="4:3"
          onSave={onSave}
          onCancel={onCancel}
        />,
      );

      expect(getByTestId('image-editor-modal')).toBeTruthy();
      expect(getByTestId('image-editor-preview')).toBeTruthy();
      expect(getByText('Edit Recipe Cover Photo')).toBeTruthy();
      expect(getByTestId('image-editor-tab-crop')).toBeTruthy();
      expect(getByTestId('image-editor-tab-rotate')).toBeTruthy();
      expect(getByTestId('image-editor-tab-adjust')).toBeTruthy();
    });

    it('allows switching between Crop, Rotate, and Adjust tabs', async () => {
      const { getByTestId, getByText } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      // Crop tab is active by default
      expect(getByText('Select Aspect Ratio:')).toBeTruthy();

      // Switch to Rotate tab
      fireEvent.press(getByTestId('image-editor-tab-rotate'));
      await waitFor(() => {
        expect(getByText('Quick Orientation:')).toBeTruthy();
      });
      expect(getByTestId('image-editor-rotate-right')).toBeTruthy();
      expect(getByTestId('image-editor-rotate-left')).toBeTruthy();
      expect(getByTestId('image-editor-flip-h')).toBeTruthy();

      // Switch to Adjust tab
      fireEvent.press(getByTestId('image-editor-tab-adjust'));
      await waitFor(() => {
        expect(getByText('Chef Food Enhancements:')).toBeTruthy();
      });
      expect(getByTestId('image-editor-preset-vibrant')).toBeTruthy();
      expect(getByTestId('image-editor-bright-plus')).toBeTruthy();
    });

    it('supports selecting different aspect ratio presets (4:3, 1:1, 16:9)', async () => {
      const { getByTestId, queryAllByText } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          defaultAspectRatio="4:3"
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      // Select 1:1 Square
      fireEvent.press(getByTestId('image-editor-aspect-1:1'));
      await waitFor(() => {
        expect(queryAllByText('1:1').length).toBeGreaterThan(0);
      });

      // Select 16:9 Wide
      fireEvent.press(getByTestId('image-editor-aspect-16:9'));
      await waitFor(() => {
        expect(queryAllByText('16:9').length).toBeGreaterThan(0);
      });
    });

    it('supports zoom in and zoom out controls', async () => {
      const { getByTestId, getByText } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      expect(getByText('1.0x')).toBeTruthy();
      fireEvent.press(getByTestId('image-editor-zoom-in'));
      await waitFor(() => {
        expect(getByText('1.2x')).toBeTruthy();
      });
      fireEvent.press(getByTestId('image-editor-zoom-out'));
      await waitFor(() => {
        expect(getByText('1.0x')).toBeTruthy();
      });
    });

    it('supports rotation and flipping controls', async () => {
      const { getByTestId } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      fireEvent.press(getByTestId('image-editor-tab-rotate'));
      await waitFor(() => {
        expect(getByTestId('image-editor-rotate-right')).toBeTruthy();
      });

      // Rotate right +90
      fireEvent.press(getByTestId('image-editor-rotate-right'));
      await waitFor(() => {
        expect(getByTestId('image-editor-rotate-right')).toBeTruthy();
      });

      // Flip H
      fireEvent.press(getByTestId('image-editor-flip-h'));
      await waitFor(() => {
        expect(getByTestId('image-editor-flip-h')).toBeTruthy();
      });
    });

    it('supports fine angle alignment adjustments', async () => {
      const { getByTestId } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      fireEvent.press(getByTestId('image-editor-tab-rotate'));
      await waitFor(() => {
        expect(getByTestId('image-editor-angle-plus')).toBeTruthy();
      });

      expect(getByTestId('image-editor-fine-angle-value').props.children).toBe('0°');

      fireEvent.press(getByTestId('image-editor-angle-plus'));
      await waitFor(() => {
        expect(getByTestId('image-editor-fine-angle-value').props.children).toBe('+2°');
      });
    });

    it('supports preset food enhancement filters and brightness/contrast adjustments', async () => {
      const { getByTestId, getByText } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      fireEvent.press(getByTestId('image-editor-tab-adjust'));
      await waitFor(() => {
        expect(getByTestId('image-editor-preset-vibrant')).toBeTruthy();
      });

      // Apply vibrant preset
      fireEvent.press(getByTestId('image-editor-preset-vibrant'));
      await waitFor(() => {
        expect(getByText('118%')).toBeTruthy(); // contrast
        expect(getByText('135%')).toBeTruthy(); // saturation
      });

      // Adjust brightness
      fireEvent.press(getByTestId('image-editor-bright-plus'));
      await waitFor(() => {
        expect(getByText('109%')).toBeTruthy();
      });
    });

    it('calls onSave when Apply & Use Photo is pressed', async () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByTestId } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={onSave}
          onCancel={onCancel}
        />,
      );

      fireEvent.press(getByTestId('image-editor-save-btn'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('calls onCancel when Cancel is pressed', async () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { getByTestId } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={onSave}
          onCancel={onCancel}
        />,
      );

      fireEvent.press(getByTestId('image-editor-footer-cancel'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('2. Chef Studio Step 1: Recipe Thumbnail Crop & Adjust Integration', () => {
    it('displays Crop & Adjust button on recipe thumbnail and opens editor', async () => {
      const form: ChefRecipeFormState = {
        name: 'Paneer Butter Masala',
        tagline: 'Rich & Creamy',
        description: 'Classic recipe',
        thumbnailUrl: sampleImageUri,
        dietType: 'veg',
        cuisine: 'North Indian',
        dishCategory: 'Curries & Gravies',
        spiceLevel: 'Medium',
        servings: 2,
        prepTimeMinutes: 15,
        cookTimeMinutes: 25,
        dietaryTags: ['veg'],
        allergens: ['Dairy'],
        ingredients: [],
        steps: [],
      };

      const onChange = jest.fn();

      const { getByTestId, getByText } = await renderWithTheme(
        <Step1Details form={form} onChange={onChange} />,
      );

      const cropBtn = getByTestId('step1-crop-adjust-btn');
      expect(cropBtn).toBeTruthy();
      expect(getByText('Crop & Adjust')).toBeTruthy();

      // Press Crop & Adjust
      fireEvent.press(cropBtn);

      // Verify modal opened
      await waitFor(() => {
        expect(getByTestId('image-editor-modal')).toBeTruthy();
      });
    });
  });

  describe('3. Chef Studio Step 3: Cooking Steps Image Crop & Adjust Integration', () => {
    it('displays Crop & Adjust button on step image and opens editor', async () => {
      const steps: StructuredStep[] = [
        {
          id: 'step-1',
          stepNumber: 1,
          title: 'Saute Aromatics',
          instruction: 'Heat oil and saute onions until golden.',
          imageUrl: sampleImageUri,
        },
      ];

      const onChange = jest.fn();

      const { getByTestId } = await renderWithTheme(
        <Step3CookingSteps steps={steps} onChange={onChange} />,
      );

      const cropBtn = getByTestId('step-crop-adjust-btn-0');
      expect(cropBtn).toBeTruthy();

      // Press Crop & Adjust for step 1 photo
      fireEvent.press(cropBtn);

      // Verify modal opened
      await waitFor(() => {
        expect(getByTestId('image-editor-modal')).toBeTruthy();
      });
    });
  });
});
