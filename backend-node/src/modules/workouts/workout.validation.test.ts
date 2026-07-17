import { completeWorkoutBodySchema, workoutListQuerySchema } from './workout.validation';

const validPayload = {
  client_form_score: 88,
  client_session_id: '550e8400-e29b-41d4-a716-446655440000',
  correct_reps: 8,
  duration_seconds: 90,
  feedback_tags: ['back_alignment'],
  incorrect_reps: 2,
  pose_engine: {
    model_name: 'pose_landmarker_lite_float16',
    model_version: '2026.07.1',
    name: 'mediapipe_pose_landmarker',
    package_version: '0.10.34',
    workout_rules_version: '1',
  },
  primary_feedback: 'Keep your torso steady',
  total_reps: 10,
  workout_type: 'squat',
} as const;

describe('workout request validation', () => {
  it.each([
    ['squat', ['back_alignment']],
    ['push_up', ['body_alignment']],
    ['crunch', ['incomplete_crunch']],
    ['bicep_curl', ['unstable_upper_arm']],
  ] as const)('accepts a bounded %s completion', (workoutType, feedbackTags) => {
    const result = completeWorkoutBodySchema.parse({
      ...validPayload,
      feedback_tags: feedbackTags,
      workout_type: workoutType,
    });

    expect(result).toMatchObject({
      clientFormScore: 88,
      clientSessionId: validPayload.client_session_id,
      feedbackTags,
      poseEngine: {
        modelVersion: '2026.07.1',
      },
      workoutType,
    });
    expect(result).not.toHaveProperty('user_id');
  });

  it('strictly rejects caller-supplied ownership', () => {
    const result = completeWorkoutBodySchema.safeParse({
      ...validPayload,
      user_id: 'another-user',
    });

    expect(result.success).toBe(false);
  });

  it('rejects inconsistent rep totals and duplicate tags', () => {
    const result = completeWorkoutBodySchema.safeParse({
      ...validPayload,
      correct_reps: 7,
      feedback_tags: ['back_alignment', 'back_alignment'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          'correct_reps + incorrect_reps must equal total_reps',
          'feedback_tags must not contain duplicates',
        ]),
      );
    }
  });

  it('rejects feedback that does not belong to the selected exercise', () => {
    const result = completeWorkoutBodySchema.safeParse({
      ...validPayload,
      feedback_tags: ['body_alignment'],
      workout_type: 'squat',
    });

    expect(result.success).toBe(false);
  });

  it('requires immutable model version metadata', () => {
    const result = completeWorkoutBodySchema.safeParse({
      ...validPayload,
      pose_engine: {
        ...validPayload.pose_engine,
        model_version: 'latest',
      },
    });

    expect(result.success).toBe(false);
  });

  it('bounds and normalizes list queries', () => {
    expect(workoutListQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(
      workoutListQuerySchema.parse({
        cursor: '507f1f77bcf86cd799439011',
        limit: '10',
        workout_type: 'crunch',
      }),
    ).toEqual({
      cursor: '507f1f77bcf86cd799439011',
      limit: 10,
      workoutType: 'crunch',
    });
    expect(workoutListQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
  });
});
