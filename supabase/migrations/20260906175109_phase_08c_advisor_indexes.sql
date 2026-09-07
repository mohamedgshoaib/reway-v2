create index export_job_details_user_job_idx
  on private.export_job_details (user_id, job_id);
create index export_job_details_user_output_file_idx
  on private.export_job_details (user_id, output_file_id);

create index import_job_details_user_job_idx
  on private.import_job_details (user_id, job_id);
create index import_job_details_user_source_file_idx
  on private.import_job_details (user_id, source_file_id);

create index import_stage_bookmark_collections_job_collection_idx
  on private.import_stage_bookmark_collections (job_id, collection_item_key);
create index import_stage_bookmark_collections_user_job_idx
  on private.import_stage_bookmark_collections (user_id, job_id);

create index import_stage_bookmark_tags_job_tag_idx
  on private.import_stage_bookmark_tags (job_id, tag_item_key);
create index import_stage_bookmark_tags_user_job_idx
  on private.import_stage_bookmark_tags (user_id, job_id);

create index import_stage_bookmarks_user_result_idx
  on private.import_stage_bookmarks (user_id, result_bookmark_id);
create index import_stage_collections_user_result_idx
  on private.import_stage_collections (user_id, result_collection_id);
create index import_stage_tags_user_result_idx
  on private.import_stage_tags (user_id, result_tag_id);

create index restore_job_details_user_job_idx
  on private.restore_job_details (user_id, job_id);
create index restore_job_details_user_recovery_file_idx
  on private.restore_job_details (user_id, recovery_file_id);
create index restore_job_details_user_source_file_idx
  on private.restore_job_details (user_id, source_file_id);

create index restore_snapshots_user_recovery_file_idx
  on private.restore_snapshots (user_id, recovery_file_id);
create index restore_snapshots_user_job_idx
  on private.restore_snapshots (user_id, restore_job_id);
