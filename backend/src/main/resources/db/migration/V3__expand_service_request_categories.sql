-- Allow the expanded citizen reporting categories and retain historical values.
ALTER TABLE service_request
  DROP CONSTRAINT service_request_category_check;

ALTER TABLE service_request
  ADD CONSTRAINT service_request_category_check
  CHECK (
    category IN (
      'Waste Management',
      'Roads and Transport',
      'Drainage and Flooding',
      'Street Lighting',
      'Water and Sanitation',
      'Public Facilities',
      'Public Safety Hazards',
      'Community Development',
      'Roads and Drainage',
      'Water Supply',
      'Waste Collection',
      'Other'
    )
  );
