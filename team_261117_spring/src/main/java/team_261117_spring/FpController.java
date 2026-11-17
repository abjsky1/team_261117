package team_261117_spring;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController 
@RequiredArgsConstructor 
@RequestMapping("/api")
public class FpController {

    private final FpService fpService;

    @PostMapping("/pp")
    public PriceDto pricePred( @RequestBody FpDto fpDto ){

        return fpService.pricePred(fpDto);
    }



}
