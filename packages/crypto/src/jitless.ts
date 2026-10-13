import { z } from 'zod';

// Import before schemas in each realm: Zod captures this setting when they are created.
z.config({ jitless: true });
