ALTER TABLE `analitica_progreso_capsulas`
  MODIFY COLUMN `assessment`
    enum('UNDERSTOOD','REINFORCE','SUPPORT','GREEN','YELLOW','RED') NOT NULL;

UPDATE `analitica_progreso_capsulas`
SET `assessment` = CASE `assessment`
  WHEN 'UNDERSTOOD' THEN 'GREEN'
  WHEN 'REINFORCE' THEN 'YELLOW'
  WHEN 'SUPPORT' THEN 'RED'
  ELSE `assessment`
END;

ALTER TABLE `analitica_progreso_capsulas`
  DROP INDEX `soa_capsule_progress_assessment`,
  CHANGE COLUMN `assessment` `semaphore_status`
    enum('GREEN','YELLOW','RED') NOT NULL,
  ADD INDEX `soa_capsule_progress_semaphore_status` (`semaphore_status`);
