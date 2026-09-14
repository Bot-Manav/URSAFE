package com.thecatalyst.dms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "document_search_index", indexes = {
    @Index(name = "idx_doc_search_word_hash", columnList = "wordHash")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentSearchIndexEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID documentId;

    @Column(nullable = false, length = 64)
    private String wordHash;
}
