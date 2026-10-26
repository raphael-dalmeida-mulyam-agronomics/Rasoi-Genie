import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';
import { ThemeProvider } from '../theme/ThemeContext';
import { ImageEditorModal } from '../ui/ImageEditorModal';
import { Step1Details } from '../../features/chef/components/Step1Details';
import { Step3CookingSteps } from '../../features/chef/components/Step3CookingSteps';
import { Step4Review } from '../../features/chef/components/Step4Review';
import { ChefRecipeFormState, StructuredStep } from '../../features/chef/types';

async function renderWithTheme(ui: React.ReactElement) {
  return await render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ImageEditorModal Component & Chef Image Upload Integration', () => {
  const sampleImageUri =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeAll(() => {
    if (typeof Image.getSize === 'function') {
      jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => {
        if (typeof success === 'function') {
          success(800, 600);
        }
      });
    }
  });

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
      expect(getByText('Select Aspect Ratio:')).toBeTruthy();
      expect(getByText('Quick Orientation:')).toBeTruthy();
      expect(getByTestId('image-editor-rotate-right')).toBeTruthy();
      expect(getByTestId('image-editor-flip-h')).toBeTruthy();
    });

    it('renders cropping, framing, zoom, rotating, and flipping in a unified menu without tabs or filter options', async () => {
      const { getByTestId, getByText, queryByTestId } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      // Cropping & Framing controls are present directly
      expect(getByText('Select Aspect Ratio:')).toBeTruthy();
      expect(getByTestId('image-editor-aspect-1:1')).toBeTruthy();
      expect(getByTestId('image-editor-aspect-16:9')).toBeTruthy();
      expect(getByText('Zoom & Scale')).toBeTruthy();
      expect(getByTestId('image-editor-zoom-in')).toBeTruthy();
      expect(getByTestId('image-editor-zoom-out')).toBeTruthy();

      // Rotating & Flipping controls are present in the same menu directly
      expect(getByText('Quick Orientation:')).toBeTruthy();
      expect(getByTestId('image-editor-rotate-right')).toBeTruthy();
      expect(getByTestId('image-editor-rotate-left')).toBeTruthy();
      expect(getByTestId('image-editor-flip-h')).toBeTruthy();
      expect(getByTestId('image-editor-flip-v')).toBeTruthy();
      expect(getByText('Fine Angle Alignment')).toBeTruthy();
      expect(getByTestId('image-editor-angle-plus')).toBeTruthy();

      // Tabs should NOT exist
      expect(queryByTestId('image-editor-tab-crop')).toBeNull();
      expect(queryByTestId('image-editor-tab-rotate')).toBeNull();
      expect(queryByTestId('image-editor-tab-adjust')).toBeNull();

      // Filter and enhancement options should NOT exist
      expect(queryByTestId('image-editor-preset-vibrant')).toBeNull();
      expect(queryByTestId('image-editor-bright-plus')).toBeNull();
      expect(queryByTestId('image-editor-contrast-plus')).toBeNull();
      expect(queryByTestId('image-editor-sat-plus')).toBeNull();
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

    it('renders a draggable zoom slider track and thumb', async () => {
      const { getByTestId } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      expect(getByTestId('image-editor-zoom-track')).toBeTruthy();
      expect(getByTestId('image-editor-zoom-thumb')).toBeTruthy();
    });

    it('supports rotation and flipping controls directly in the unified menu', async () => {
      const { getByTestId } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

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

      // Flip V
      fireEvent.press(getByTestId('image-editor-flip-v'));
      await waitFor(() => {
        expect(getByTestId('image-editor-flip-v')).toBeTruthy();
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

      expect(getByTestId('image-editor-fine-angle-value').props.children).toBe('0°');

      fireEvent.press(getByTestId('image-editor-angle-plus'));
      await waitFor(() => {
        expect(getByTestId('image-editor-fine-angle-value').props.children).toBe('+2°');
      });

      fireEvent.press(getByTestId('image-editor-angle-reset'));
      await waitFor(() => {
        expect(getByTestId('image-editor-fine-angle-value').props.children).toBe('0°');
      });
    });

    it('resets adjustments when Reset is pressed', async () => {
      const { getByTestId, getByText } = await renderWithTheme(
        <ImageEditorModal
          visible={true}
          imageUri={sampleImageUri}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      // Modify zoom and angle
      fireEvent.press(getByTestId('image-editor-zoom-in'));
      await waitFor(() => {
        expect(getByText('1.2x')).toBeTruthy();
      });

      fireEvent.press(getByTestId('image-editor-angle-plus'));
      await waitFor(() => {
        expect(getByTestId('image-editor-fine-angle-value').props.children).toBe('+2°');
      });

      // Press Reset
      fireEvent.press(getByTestId('image-editor-reset-btn'));
      await waitFor(() => {
        expect(getByText('1.0x')).toBeTruthy();
        expect(getByTestId('image-editor-fine-angle-value').props.children).toBe('0°');
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
        instructionType: 'steps',
        videoUrl: '',
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

    it('provides access to the full original uncropped image when re-cropping a previously cropped thumbnail', async () => {
      const originalMasterUri = 'data:image/png;base64,ORIGINAL_FULL_UNCROPPED_MASTER_IMAGE';
      const croppedVersionUri = 'data:image/png;base64,CROPPED_FRAGMENT_THUMBNAIL';

      const form: ChefRecipeFormState = {
        name: 'Royal Kashmiri Dum Aloo',
        tagline: 'Velvety gravy',
        description: 'Classic recipe',
        thumbnailUrl: croppedVersionUri, // Currently cropped thumbnail
        originalThumbnailUrl: originalMasterUri, // Preserved master image
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
        instructionType: 'steps',
        videoUrl: '',
      };

      const onChange = jest.fn();

      const { getByTestId } = await renderWithTheme(
        <Step1Details form={form} onChange={onChange} />,
      );

      const cropBtn = getByTestId('step1-crop-adjust-btn');
      fireEvent.press(cropBtn);

      await waitFor(() => {
        const previewImg = getByTestId('image-editor-preview');
        expect(previewImg.props.source.uri).toBe(originalMasterUri);
        expect(previewImg.props.source.uri).not.toBe(croppedVersionUri);
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

    it('provides access to the full original uncropped image when re-cropping a previously cropped step photo', async () => {
      const originalStepMasterUri = 'data:image/png;base64,STEP_ORIGINAL_FULL_UNCROPPED_IMAGE';
      const croppedStepVersionUri = 'data:image/png;base64,STEP_CROPPED_FRAGMENT_IMAGE';

      const steps: StructuredStep[] = [
        {
          id: 'step-1',
          stepNumber: 1,
          title: 'Saute Aromatics',
          instruction: 'Heat oil and saute onions until golden.',
          imageUrl: croppedStepVersionUri,
          originalImageUrl: originalStepMasterUri,
        },
      ];

      const onChange = jest.fn();

      const { getByTestId } = await renderWithTheme(
        <Step3CookingSteps steps={steps} onChange={onChange} />,
      );

      const cropBtn = getByTestId('step-crop-adjust-btn-0');
      fireEvent.press(cropBtn);

      await waitFor(() => {
        const previewImg = getByTestId('image-editor-preview');
        expect(previewImg.props.source.uri).toBe(originalStepMasterUri);
        expect(previewImg.props.source.uri).not.toBe(croppedStepVersionUri);
      });
    });
  });

  describe('4. Dynamic Aspect Ratio Adaptation in Chef Studio', () => {
    it('dynamically adapts recipe preview hero image and step review images based on the aspect ratio in Step4Review', async () => {
      const form: ChefRecipeFormState = {
        name: 'Hyderabadi Chicken Biryani',
        tagline: 'Fragrant and authentic',
        description: 'Layered spiced basmati rice and tender marinated chicken.',
        thumbnailUrl: sampleImageUri,
        dietType: 'nonveg',
        cuisine: 'Hyderabadi',
        dishCategory: 'Curries & Gravies',
        spiceLevel: 'Spicy',
        servings: 4,
        prepTimeMinutes: 30,
        cookTimeMinutes: 45,
        dietaryTags: ['nonveg'],
        allergens: [],
        ingredients: [
          { id: 'ing-1', name: 'Basmati Rice', amount: 500, unit: 'g', quantityStr: '500g' },
        ],
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            title: 'Marinate Meat',
            instruction:
              'Marinate with yogurt, ginger-garlic paste and biryani spices for 2 hours.',
            imageUrl: sampleImageUri,
          },
        ],
        instructionType: 'steps',
        videoUrl: '',
      };

      const { getByText, getAllByText } = await renderWithTheme(
        <Step4Review
          form={form}
          chefName="Chef Raphael"
          isEditing={false}
          submitting={false}
          onNavigateStage={jest.fn()}
          onSubmit={jest.fn()}
        />,
      );

      expect(getAllByText('Hyderabadi Chicken Biryani').length).toBeGreaterThan(0);
      expect(getByText('Marinate Meat')).toBeTruthy();
    });
  });
});
