package com.iaspring.backspring.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.iaspring.backspring.dto.UtilisateurCreateDto;
import com.iaspring.backspring.dto.UtilisateurDto;
import com.iaspring.backspring.dto.UtilisateurUpdateDto;
import com.iaspring.backspring.service.UtilisateurService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/utilisateurs")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    @PostMapping
    public ResponseEntity<?> creer(@RequestBody UtilisateurCreateDto dto) {
        try {
            UtilisateurDto nouvelUtilisateur = utilisateurService.creer(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(nouvelUtilisateur);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<UtilisateurDto>> listerTous() {
        return ResponseEntity.ok(utilisateurService.recupererTous());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurDto> recupererParId(@PathVariable Long id) {
        return ResponseEntity.ok(utilisateurService.recupererParId(id));
    }

    @RequestMapping(value = "/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<UtilisateurDto> modifier(@PathVariable Long id, @RequestBody UtilisateurUpdateDto dto) {
        return ResponseEntity.ok(utilisateurService.modifier(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        utilisateurService.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}