-- ==================================================
-- Safe Reseed Script for CBT Platform
-- Only resets subjects, questions, and options
-- ==================================================

-- 1?? Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- 2?? Clear dependent tables in proper order
DELETE FROM question_options;
DELETE FROM questions;
DELETE FROM subjects;

-- 3?? Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- 4?? Seed default subjects
INSERT IGNORE INTO subjects (id, name, description, created_by) VALUES
(1, 'Mathematics', 'Basic and advanced mathematical concepts', 1),
(2, 'English Language', 'Grammar, vocabulary, and comprehension', 1),
(3, 'Science', 'General science and scientific principles', 1),
(4, 'History', 'World and local history topics', 1),
(5, 'Geography', 'Physical and human geography', 1);

-- 5?? Seed Mathematics questions
INSERT IGNORE INTO questions (id, subject_id, question_text, question_type, difficulty, points, explanation, created_by) VALUES
(1, 1, 'What is 15 + 27?', 'multiple_choice', 'easy', 1, 'Simple addition: 15 + 27 = 42', 1),
(2, 1, 'What is the square root of 64?', 'multiple_choice', 'medium', 2, 'The square root of 64 is 8 because 8 × 8 = 64', 1),
(3, 1, 'Solve for x: 2x + 5 = 15', 'multiple_choice', 'medium', 2, 'Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5', 1),
(4, 1, 'What is 12 × 8?', 'multiple_choice', 'easy', 1, 'Multiplication: 12 × 8 = 96', 1),
(5, 1, 'Is 17 a prime number?', 'true_false', 'medium', 2, 'Yes, 17 is prime because it only has factors 1 and 17', 1);

-- 6?? Seed English questions
INSERT IGNORE INTO questions (id, subject_id, question_text, question_type, difficulty, points, explanation, created_by) VALUES
(6, 2, 'Which word is a noun in this sentence: "The quick brown fox jumps"?', 'multiple_choice', 'easy', 1, 'Fox is a noun - it names a thing/animal', 1),
(7, 2, 'What is the past tense of "run"?', 'multiple_choice', 'easy', 1, 'The past tense of run is ran', 1),
(8, 2, 'Which sentence uses correct grammar?', 'multiple_choice', 'medium', 2, 'Subject-verb agreement and proper tense usage', 1),
(9, 2, 'A group of words that expresses a complete thought is called a ___', 'fill_blank', 'medium', 2, 'A sentence expresses a complete thought', 1),
(10, 2, 'The word "beautiful" is an adjective.', 'true_false', 'easy', 1, 'True - beautiful describes or modifies nouns', 1);

-- 7?? Seed answer options for Mathematics questions
INSERT IGNORE INTO question_options (question_id, option_text, is_correct, option_order) VALUES
(1, '42', true, 1),(1, '32', false, 2),(1, '52', false, 3),(1, '41', false, 4),
(2, '8', true, 1),(2, '6', false, 2),(2, '7', false, 3),(2, '9', false, 4),
(3, '5', true, 1),(3, '10', false, 2),(3, '7', false, 3),(3, '3', false, 4),
(4, '96', true, 1),(4, '86', false, 2),(4, '104', false, 3),(4, '88', false, 4),
(5, 'True', true, 1),(5, 'False', false, 2);

-- 8?? Seed answer options for English questions
INSERT IGNORE INTO question_options (question_id, option_text, is_correct, option_order) VALUES
(6, 'fox', true, 1),(6, 'quick', false, 2),(6, 'brown', false, 3),(6, 'jumps', false, 4),
(7, 'ran', true, 1),(7, 'runned', false, 2),(7, 'running', false, 3),(7, 'runs', false, 4),
(8, 'She goes to school every day.', true, 1),(8, 'She go to school every day.', false, 2),(8, 'She going to school every day.', false, 3),(8, 'She gone to school every day.', false, 4),
(9, 'sentence', true, 1),(9, 'phrase', false, 2),(9, 'clause', false, 3),(9, 'word', false, 4),
(10, 'True', true, 1),(10, 'False', false, 2);
