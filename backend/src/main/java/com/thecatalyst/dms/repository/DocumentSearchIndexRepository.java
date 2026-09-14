package com.thecatalyst.dms.repository;

import com.thecatalyst.dms.entity.DocumentSearchIndexEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentSearchIndexRepository extends JpaRepository<DocumentSearchIndexEntity, UUID> {
    
    @Query("SELECT DISTINCT idx.documentId FROM DocumentSearchIndexEntity idx WHERE idx.wordHash IN :hashes")
    List<UUID> findDocumentIdsByWordHashes(@Param("hashes") List<String> hashes);
}
